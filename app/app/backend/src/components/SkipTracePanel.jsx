import { useState } from "react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { Radio, Phone, Mail, Users } from "lucide-react";
import "./SkipTracePanel.css";

export const SkipTracePanel = ({ property, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const skip = property.skip_trace_data;

  const run = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/properties/${property.id}/skip-trace`);
      // FIX 3: optional chaining — onUpdate may not be passed
      onUpdate?.({ ...property, skip_traced: true, skip_trace_data: data });
      toast.success("Identity profile resolved");
    } catch {
      // FIX 2: catch was missing — errors were silently swallowed
      toast.error("Skip trace failed or timed out");
    } finally {
      setLoading(false);
    }
  };

  /* ── EMPTY STATE ─────────────────────────────────────────────────────── */
  if (!skip) {
    return (
      <div className="stp-shell" data-testid="skip-trace-empty">
        <div className="stp-empty-header">
          <Radio className="stp-icon" strokeWidth={1.5} aria-hidden="true" />
          <span className="stp-title">Skip Trace</span>
        </div>
        <p className="stp-empty-body">
          Query the Endato / EnformionGO endpoint to retrieve verified mobile
          lines, landlines, emails, and known relatives for this owner of record.
        </p>
        <button
          data-testid="run-skip-trace-btn"
          onClick={run}
          disabled={loading}
          className="stp-run-btn"
        >
          {/* FIX 1: #DEFF9A lime — not #39ff14 */}
          <Radio
            className={`w-3.5 h-3.5 ${loading ? "stp-pulse" : ""}`}
            strokeWidth={1.5}
            aria-hidden="true"
          />
          {loading ? "Querying Network..." : "Execute Skip Trace"}
        </button>
      </div>
    );
  }

  /* ── RESULTS ─────────────────────────────────────────────────────────── */
  return (
    <div className="stp-shell" data-testid="skip-trace-results">

      {/* Header */}
      <div className="stp-results-header">
        <div className="stp-results-header-left">
          {/* FIX 4: no animate-pulse on resolved data */}
          <Radio className="stp-icon" strokeWidth={1.5} aria-hidden="true" />
          <span className="stp-title">Skip Trace · Connected</span>
        </div>
        {/* FIX 5: .trim() on provider string */}
        <span className="stp-provider">
          {skip.provider?.split("(")[0].trim() ?? "—"}
        </span>
      </div>

      {/* Owner of record */}
      <div className="stp-section">
        <div className="stp-section-label">Owner of Record</div>
        <div className="stp-owner-name">{skip.owner_name}</div>
        {skip.mailing_address && (
          <div className="stp-owner-address">{skip.mailing_address}</div>
        )}
      </div>

      {/* Mobile lines */}
      <div className="stp-section">
        <div className="stp-section-label-row">
          <Phone className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
          Mobile Lines ({skip.mobile_lines?.length ?? 0})
        </div>
        {!skip.mobile_lines?.length && (
          <div className="stp-none">— None found</div>
        )}
        {skip.mobile_lines?.map((m, i) => (
          <div
            key={i}
            className="stp-phone-row"
            data-testid={`mobile-line-${i}`}
          >
            <div>
              {/* FIX 6: .neon class replaced — was undefined */}
              <div className="stp-phone-number">{m.number}</div>
              <div className="stp-phone-meta">
                {m.carrier} · {m.confidence}
              </div>
            </div>
            {/* FIX 1: #DEFF9A lime badge — not #39ff14 */}
            <span className="stp-type-badge">{m.type}</span>
          </div>
        ))}
      </div>

      {/* Landlines */}
      {skip.landlines?.length > 0 && (
        <div className="stp-section">
          <div className="stp-section-label-row">
            <Phone className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
            Landlines
          </div>
          {skip.landlines.map((l, i) => (
            <div key={i} className="stp-phone-row">
              <div>
                <div className="stp-phone-number muted">{l.number}</div>
                <div className="stp-phone-meta">{l.carrier}</div>
              </div>
              <span className="stp-land-badge">Land</span>
            </div>
          ))}
        </div>
      )}

      {/* Emails */}
      {(skip.emails?.length > 0) && (
        <div className="stp-section">
          <div className="stp-section-label-row">
            <Mail className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
            Emails
          </div>
          {skip.emails.map((e, i) => (
            <div
              key={i}
              className="stp-email"
              data-testid={`email-${i}`}
            >
              {e}
            </div>
          ))}
        </div>
      )}

      {/* Known relatives */}
      {skip.relatives?.length > 0 && (
        <div className="stp-section">
          <div className="stp-section-label-row">
            <Users className="w-3 h-3" strokeWidth={1.5} aria-hidden="true" />
            Known Relatives
          </div>
          <div className="stp-relatives">
            {skip.relatives.map((r, i) => (
              <span key={i} className="stp-relative-tag">{r}</span>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default SkipTracePanel;
