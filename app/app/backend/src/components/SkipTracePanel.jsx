"import { useState } from "react";
import { api } from "@/lib/api";
import { Radio, Phone, Mail, Users } from "lucide-react";

export const SkipTracePanel = ({ property, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const skip = property.skip_trace_data;

  const run = async () => {
    setLoading(true);
    try {
      const { data } = await api.post(`/properties/${property.id}/skip-trace`);
      onUpdate({ ...property, skip_traced: true, skip_trace_data: data });
    } finally { setLoading(false); }
  };

  if (!skip) {
    return (
      <div className="terminal-panel p-5" data-testid="skip-trace-empty">
        <div className="flex items-center gap-2 mb-3">
          <Radio className="w-4 h-4 text-[#39ff14]" strokeWidth={1.5}/>
          <span className="font-display font-bold uppercase text-xs tracking-wide">Skip Trace</span>
        </div>
        <p className="text-xs text-neutral-400 mb-4 leading-relaxed">
          Query the Endato/EnformionGO endpoint to retrieve verified mobile lines, landlines, emails and known relatives for this owner of record.
        </p>
        <button data-testid="run-skip-trace-btn" onClick={run} disabled={loading}
          className="w-full bg-[#39ff14] text-black hover:bg-[#2bd80f] py-3 text-xs font-bold uppercase tracking-[0.15em] font-mono-pi disabled:opacity-50">
          {loading ? "Querying API..." : "▶ Run Skip Trace"}
        </button>
      </div>
    );
  }

  return (
    <div className="terminal-panel p-0" data-testid="skip-trace-results">
      <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-[#39ff14] animate-pulse" strokeWidth={1.5}/>
          <span className="font-display font-bold uppercase text-xs tracking-wide">Skip Trace · Connected</span>
        </div>
        <span className="label-xs text-neutral-500">{skip.provider?.split('(')[0]}</span>
      </div>

      <div className="divide-y divide-neutral-800">
        <div className="px-4 py-3">
          <div className="label-xs text-neutral-500 mb-1">Owner of Record</div>
          <div className="text-sm font-semibold font-mono-pi">{skip.owner_name}</div>
          <div className="text-[11px] text-neutral-400 mt-1">{skip.mailing_address}</div>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center gap-2 label-xs text-neutral-500 mb-2">
            <Phone className="w-3 h-3" strokeWidth={1.5}/> Mobile Lines ({skip.mobile_lines?.length || 0})
          </div>
          {skip.mobile_lines?.length === 0 && <div className="text-[11px] text-neutral-500">— None found</div>}
          {skip.mobile_lines?.map((m, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-neutral-800 last:border-0" data-testid={`mobile-line-${i}`}>
              <div>
                <div className="neon text-base font-semibold">{m.number}</div>
                <div className="text-[10px] text-neutral-500 uppercase tracking-wider">{m.carrier} · {m.confidence}</div>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 bg-[#39ff14] text-black uppercase">{m.type}</span>
            </div>
          ))}
        </div>

        {skip.landlines?.length > 0 && (
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 label-xs text-neutral-500 mb-2">
              <Phone className="w-3 h-3" strokeWidth={1.5}/> Landlines
            </div>
            {skip.landlines.map((l, i) => (
              <div key={i} className="flex items-center justify-between py-1.5">
                <div>
                  <div className="font-mono-pi text-sm text-neutral-300">{l.number}</div>
                  <div className="text-[10px] text-neutral-500 uppercase tracking-wider">{l.carrier}</div>
                </div>
                <span className="text-[9px] font-bold px-1.5 py-0.5 border border-neutral-700 text-neutral-400 uppercase">LAND</span>
              </div>
            ))}
          </div>
        )}

        <div className="px-4 py-3">
          <div className="flex items-center gap-2 label-xs text-neutral-500 mb-2">
            <Mail className="w-3 h-3" strokeWidth={1.5}/> Emails
          </div>
          {skip.emails?.map((e, i) => (
            <div key={i} className="neon text-sm font-mono-pi py-1" data-testid={`email-${i}`}>{e}</div>
          ))}
        </div>

        {skip.relatives?.length > 0 && (
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 label-xs text-neutral-500 mb-2">
              <Users className="w-3 h-3" strokeWidth={1.5}/> Known Relatives
            </div>
            <div className="flex flex-wrap gap-1.5">
              {skip.relatives.map((r, i) => (
                <span key={i} className="text-[11px] border border-neutral-700 px-2 py-0.5 font-mono-pi text-neutral-300">{r}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SkipTracePanel;
"
