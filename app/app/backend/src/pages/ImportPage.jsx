import { useState, useRef } from "react";
import { AppShell } from "../components/AppShell";
import { api } from "../lib/api";
import { toast } from "sonner";
import { UploadCloud, Play, ShieldAlert, CheckCircle2 } from "lucide-react";
import "./ImportPage.css";

// ─────────────────────────────────────────────────────────────────────────────
// BUG 1 FIX: Real CSV parser that handles quoted fields containing commas.
// e.g.  "123 Main St, Apt 4",Philadelphia,PA  →  3 fields, not 4.
// ─────────────────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const rows = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    if (!line.trim()) continue;
    const fields = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        // Handle escaped double-quote inside a quoted field ("")
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    rows.push(fields);
  }
  return rows;
}

// BUG 4 FIX: read internal key from env var so operators don't have to
// type it in — the input field is a fallback when the var isn't set.
const ENV_KEY = import.meta.env.VITE_INTERNAL_KEY || "";

const BATCH_SIZE = 10; // concurrent requests per wave

export default function ImportPage() {
  const [csvData,    setCsvData]    = useState([]);
  const [headers,    setHeaders]    = useState([]);
  const [systemKey,  setSystemKey]  = useState(ENV_KEY);
  const [mappings,   setMappings]   = useState({
    site_address:  "",
    city:          "",
    state:         "",
    distress_type: "",
  });
  const [processing, setProcessing] = useState(false);
  const [progress,   setProgress]   = useState({ current: 0, total: 0 });
  const [done,       setDone]       = useState(null); // { successes, total }
  const fileRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setDone(null);
    const reader = new FileReader();

    // BUG 2 FIX: handle file read errors explicitly
    reader.onerror = () => toast.error("Failed to read file — check that it's a valid UTF-8 CSV");

    reader.onload = (event) => {
      const rows = parseCSV(event.target.result); // BUG 1 FIX: proper parser
      if (rows.length < 2) {
        toast.error("CSV appears empty or has no data rows");
        return;
      }
      const rawHeaders = rows[0];
      const dataRows   = rows.slice(1).filter(r =>
        r.length === rawHeaders.length && r.some(c => c !== "")
      );
      setHeaders(rawHeaders);
      setCsvData(dataRows);

      // Smart header auto-mapping
      setMappings({
        site_address:  rawHeaders.find(h => /address/i.test(h))  || "",
        city:          rawHeaders.find(h => /city/i.test(h))      || "",
        state:         rawHeaders.find(h => /state/i.test(h))     || "",
        distress_type: rawHeaders.find(h => /status|distress/i.test(h)) || "",
      });
      toast.success(`Loaded ${dataRows.length} rows`);
    };

    reader.readAsText(file);
  };

  // BUG 3 FIX: send requests in parallel batches instead of serial one-by-one
  const executeBatchIngestion = async () => {
    if (!systemKey.trim()) {
      toast.error("System key required");
      return;
    }
    if (!mappings.site_address || !mappings.city || !mappings.state) {
      toast.error("Address, city, and state columns must be mapped");
      return;
    }

    const addrIdx    = headers.indexOf(mappings.site_address);
    const cityIdx    = headers.indexOf(mappings.city);
    const stateIdx   = headers.indexOf(mappings.state);
    const distressIdx= headers.indexOf(mappings.distress_type);

    setProcessing(true);
    setDone(null);
    setProgress({ current: 0, total: csvData.length });

    let successes = 0;

    for (let i = 0; i < csvData.length; i += BATCH_SIZE) {
      const batch = csvData.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((row) => {
          const payload = {
            site_address:      row[addrIdx]    || "",
            city:              row[cityIdx]    || "",
            state:             row[stateIdx]   || "",
            distress_statuses: distressIdx !== -1 && row[distressIdx]
              ? [row[distressIdx]]
              : ["Tax Delinquent"],
            vacant: false,
          };
          return api.post("/admin/ingest-hybrid", payload, {
            headers: { "X-PropIntel-Key": systemKey },
          });
        })
      );
      successes += results.filter(r => r.status === "fulfilled").length;
      setProgress(p => ({ ...p, current: Math.min(i + BATCH_SIZE, csvData.length) }));
    }

    setProcessing(false);
    // BUG 8 FIX: don't clear csvData — keep preview visible, show completion banner
    setDone({ successes, total: csvData.length });
    toast.success(`Ingested ${successes} of ${csvData.length} properties`);
  };

  const pct = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  return (
    <AppShell>
      <div className="import-root">

        {/* ── LEFT: CONTROL PANEL ── */}
        <aside className="import-sidebar">
          <div className="import-sidebar-scroll">

            <div className="import-section-label">// Ingestion Control</div>

            {/* System key — BUG 4 FIX: pre-filled from env var */}
            <div className="import-field-group">
              <label className="import-label">Internal System Key</label>
              <input
                type="password"
                value={systemKey}
                onChange={(e) => setSystemKey(e.target.value)}
                placeholder="••••••••••••"
                className="import-input"
                autoComplete="off"
              />
              {ENV_KEY && (
                <span className="import-hint">// loaded from environment</span>
              )}
            </div>

            {/* File upload */}
            <div className="import-upload-zone">
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="import-upload-input"
                aria-label="Upload CSV file"
              />
              <UploadCloud className="import-upload-icon" aria-hidden="true" />
              <span className="import-upload-title">Upload County CSV</span>
              <span className="import-upload-hint">Plain UTF-8 · quoted fields supported</span>
            </div>

            {/* Column mappings */}
            {headers.length > 0 && (
              <div className="import-mappings">
                <div className="import-section-label" style={{ marginBottom: "10px" }}>
                  Map Schema Headers
                </div>
                {Object.keys(mappings).map((field) => (
                  <div key={field} className="import-field-group">
                    <label className="import-label">
                      {field.replace(/_/g, " ")}
                      {["site_address","city","state"].includes(field) && (
                        <span className="import-required">*</span>
                      )}
                    </label>
                    <select
                      value={mappings[field]}
                      onChange={(e) => setMappings({ ...mappings, [field]: e.target.value })}
                      className="import-select"
                    >
                      <option value="">— select column —</option>
                      {headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Execute button + progress — sticky at bottom */}
          {csvData.length > 0 && (
            <div className="import-sidebar-footer">
              {/* BUG 7 FIX: visual progress bar */}
              {processing && (
                <div className="import-progress">
                  <div className="import-progress-bar">
                    <div className="import-progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="import-progress-label">
                    {progress.current} / {progress.total} rows
                  </span>
                </div>
              )}
              <button
                onClick={executeBatchIngestion}
                disabled={processing}
                className="import-run-btn"
              >
                {/* BUG MINOR FIX: removed fill-current — Lucide uses stroke not fill */}
                <Play className="w-3.5 h-3.5" aria-hidden="true" />
                {processing
                  ? `Ingesting... ${pct}%`
                  : `Execute — ${csvData.length} Rows`}
              </button>
            </div>
          )}
        </aside>

        {/* ── RIGHT: DATA PREVIEW ── */}
        <div className="import-main">
          {csvData.length === 0 ? (
            <div className="import-empty">
              <ShieldAlert className="import-empty-icon" aria-hidden="true" />
              <div className="import-empty-title">// Storage Matrix Offline</div>
              <p className="import-empty-body">
                Load a county foreclosure or tax-default CSV to preview and stage the data before ingestion.
              </p>
            </div>
          ) : (
            <div className="import-preview">

              {/* BUG 8 FIX: completion banner shown over data, data stays visible */}
              {done && (
                <div className="import-done-banner">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  {done.successes} of {done.total} properties ingested
                  {done.successes < done.total && (
                    <span className="import-done-failures">
                      · {done.total - done.successes} failed
                    </span>
                  )}
                </div>
              )}

              <div className="import-preview-header">
                <span className="import-preview-label">Staging Grid</span>
                <span className="import-preview-count">{csvData.length} records</span>
              </div>

              <div className="import-table-wrap">
                <table className="import-table">
                  <thead>
                    <tr>
                      {headers.map((h, i) => (
                        <th key={i}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(0, 15).map((row, rIdx) => (
                      <tr key={rIdx}>
                        {row.map((cell, cIdx) => (
                          <td key={cIdx}>{cell || "—"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {csvData.length > 15 && (
                <div className="import-preview-footnote">
                  Showing first 15 of {csvData.length} rows — all rows execute on ingestion
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
