import { useState } from "react";
import { AppShell } from "../components/AppShell";
import { api } from "../lib/api";
import { toast } from "sonner";
import { UploadCloud, Play, CheckCircle2, ShieldAlert } from "lucide-react";

export default function ImportPage() {
  const [csvData, setCsvData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [systemKey, setSystemKey] = useState("");
  const [mappings, setMappings] = useState({
    site_address: "",
    city: "",
    state: "",
    distress_type: "",
  });
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split("\n").map(line => line.split(",").map(cell => cell.replace(/^["']|["']$/g, "").trim()));
      
      if (lines.length > 0) {
        const rawHeaders = lines[0];
        setHeaders(rawHeaders);
        // Store lines without headers and filter out empty arrays
        const rows = lines.slice(1).filter(r => r.length === rawHeaders.length && r.some(c => c !== ""));
        setCsvData(rows);
        
        // Dynamic smart guessing for data headers
        setMappings({
          site_address: rawHeaders.find(h => h.toLowerCase().includes("address")) || "",
          city: rawHeaders.find(h => h.toLowerCase().includes("city")) || "",
          state: rawHeaders.find(h => h.toLowerCase().includes("state")) || "",
          distress_type: rawHeaders.find(h => h.toLowerCase().includes("status") || h.toLowerCase().includes("distress")) || "",
        });
        toast.success(`Cached ${rows.length} rows from spreadsheet`);
      }
    };
    reader.readAsText(file);
  };

  const executeBatchIngestion = async () => {
    if (!systemKey) {
      toast.error("Security handshake encryption key required");
      return;
    }
    if (!mappings.site_address || !mappings.city || !mappings.state) {
      toast.error("Core localization maps must be explicitly matched");
      return;
    }

    setProcessing(true);
    setProgress({ current: 0, total: csvData.length });

    let successes = 0;
    const addrIndex = headers.indexOf(mappings.site_address);
    const cityIndex = headers.indexOf(mappings.city);
    const stateIndex = headers.indexOf(mappings.state);
    const distressIndex = headers.indexOf(mappings.distress_type);

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      try {
        const payload = {
          site_address: row[addrIndex],
          city: row[cityIndex],
          state: row[stateIndex],
          distress_statuses: distressIndex !== -1 && row[distressIndex] ? [row[distressIndex]] : ["Tax Delinquent"],
          vacant: false
        };

        await api.post("/admin/ingest-hybrid", payload, {
          headers: { "X-PropIntel-Key": systemKey }
        });
        successes++;
      } catch (err) {
        console.error("Row deployment rejection:", err);
      }
      setProgress(p => ({ ...p, current: i + 1 }));
    }

    setProcessing(false);
    setCsvData([]);
    toast.success(`Ingested ${successes} properties successfully into live data engine`);
  };

  return (
    <AppShell>
      <div className="h-full w-full bg-black flex flex-col md:flex-row font-sans text-white overflow-hidden">
        
        {/* CONTROL CONFIG FLANK */}
        <div className="w-full md:w-80 bg-[#050505] border-r border-neutral-900 p-6 flex flex-col justify-between overflow-y-auto shrink-0">
          <div>
            <h3 className="text-[#DEFF9A] text-[11px] font-bold uppercase tracking-[0.2em] mb-6">// Ingestion Control</h3>
            
            {/* Encryption handshake access gate */}
            <div className="mb-6">
              <label className="font-mono text-[9px] uppercase tracking-wider text-neutral-500 block mb-2">Internal System Key</label>
              <div className="relative">
                <input type="password" value={systemKey} onChange={(e) => setSystemKey(e.target.value)} placeholder="••••••••••••"
                  className="w-full bg-[#111] border border-neutral-800 text-xs text-white font-mono p-2 focus:border-[#DEFF9A] outline-none" />
              </div>
            </div>

            {/* Drag & Drop Anchor Wrapper */}
            <div className="border border-dashed border-neutral-800 p-4 text-center bg-[#0a0a0a] hover:border-neutral-700 transition-colors relative mb-6">
              <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
              <UploadCloud className="w-6 h-6 text-neutral-500 mx-auto mb-2" />
              <span className="text-xs font-bold uppercase tracking-tight block">Upload County CSV</span>
              <span className="text-[10px] text-neutral-600 font-mono block mt-1">Plain UTF-8 text files</span>
            </div>

            {/* On-screen Schema Header Mapping Selectors */}
            {headers.length > 0 && (
              <div className="space-y-4 border-t border-neutral-900 pt-4">
                <h4 className="text-[10px] font-mono uppercase text-neutral-400">Map Schema Headers</h4>
                {Object.keys(mappings).map((field) => (
                  <div key={field}>
                    <label className="font-mono text-[9px] uppercase text-neutral-600 block mb-1">{field.replace("_", " ")}</label>
                    <select value={mappings[field]} onChange={(e) => setMappings({ ...mappings, [field]: e.target.value })}
                      className="w-full bg-[#111] border border-neutral-800 text-xs font-mono text-white p-2 outline-none focus:border-[#DEFF9A]">
                      <option value="">-- Dropdown Match --</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>

          {csvData.length > 0 && (
            <button onClick={executeBatchIngestion} disabled={processing}
              className="w-full bg-[#DEFF9A] hover:bg-white text-black font-mono text-xs font-bold uppercase p-3 tracking-wider flex items-center justify-center gap-2 mt-6 transition-colors">
              <Play className="w-4 h-4 fill-current" /> {processing ? `Streaming ${progress.current}/${progress.total}` : "Execute Core Load"}
            </button>
          )}
        </div>

        {/* INTERACTIVE COMPILING GRID CORE VIEWPORTS */}
        <div className="flex-1 overflow-auto p-6 bg-black">
          {csvData.length === 0 ? (
            <div className="h-full w-full border border-neutral-900 bg-[#020202] flex flex-col items-center justify-center p-8 text-center">
              <ShieldAlert className="w-8 h-8 text-neutral-700 mb-3" />
              <div className="text-xs uppercase font-mono tracking-widest text-neutral-500">// STORAGE MATRIX OFFLINE</div>
              <p className="text-xs text-neutral-600 max-w-sm mt-2">Load a local county foreclosure or tax default spreadsheet to visualize the live staging matrix layout.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-neutral-900 pb-3">
                <div className="text-xs uppercase font-mono tracking-wider text-neutral-400">Staging Area Grid Layer</div>
                <div className="text-xs font-mono text-[#DEFF9A] bg-[#deff9a1a] border border-[#deff9a33] px-2 py-0.5 uppercase">{csvData.length} records armed</div>
              </div>
              <div className="w-full overflow-x-auto border border-neutral-900">
                <table className="w-full border-collapse text-left font-mono text-xs">
                  <thead>
                    <tr className="bg-[#050505] text-[#DEFF9A] uppercase border-b border-neutral-900">
                      {headers.map((h, i) => (
                        <th key={i} className="p-3 text-[10px] tracking-wider border-r border-neutral-900 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(0, 15).map((row, rIdx) => (
                      <tr key={rIdx} className="border-b border-neutral-900 hover:bg-[#050505] transition-colors">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="p-3 text-neutral-400 border-r border-neutral-900 max-w-xs truncate">{cell || "—"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {csvData.length > 15 && (
                <div className="text-[10px] text-neutral-600 font-mono text-right italic">
                  * Showing initial 15 rows preview. All {csvData.length} entries will execute upon core deployment initialization.
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </AppShell>
  );
}
