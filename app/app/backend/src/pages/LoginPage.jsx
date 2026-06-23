"import { useState } from \"react\";
import { useNavigate, Link } from \"react-router-dom\";
import { useAuth } from \"@/context/AuthContext\";
import { Database } from \"lucide-react\";

export default function LoginPage() {
  const { login, error } = useAuth();
  const [email, setEmail] = useState(\"admin@propintel.io\");
  const [password, setPassword] = useState(\"Demo2026!\");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (ok) nav(\"/dashboard\");
  };

  return (
    <div className=\"min-h-screen w-screen grid grid-cols-1 lg:grid-cols-5\">
      {/* Left brand panel */}
      <div className=\"lg:col-span-3 bg-[#0a0a0a] text-white p-10 flex flex-col justify-between\" data-testid=\"login-brand-panel\">
        <div className=\"flex items-center gap-2\">
          <Database className=\"w-6 h-6\" strokeWidth={1.5}/>
          <span className=\"font-display font-black text-xl uppercase\">PropIntel</span>
        </div>
        <div className=\"space-y-6 max-w-2xl\">
          <div className=\"label-xs text-neutral-400\">/ off-market intelligence terminal</div>
          <h1 className=\"font-display font-black uppercase text-4xl sm:text-5xl lg:text-6xl leading-[0.95] tracking-tight\">
            Find vacant.<br/>Find delinquent.<br/><span className=\"text-[#39ff14]\">Find owners.</span>
          </h1>
          <p className=\"text-neutral-400 text-sm max-w-md leading-relaxed\">
            Aggregate municipal tax-default logs, USPS vacancy data, and ATTOM property records. Underwrite repair cost and ARV in one click. Skip-trace verified mobile lines &amp; emails. Export to Excel.
          </p>
          <div className=\"grid grid-cols-3 gap-0 border-t border-neutral-800 pt-6 max-w-md\">
            <div className=\"border-r border-neutral-800 pr-4\">
              <div className=\"font-mono-pi text-2xl text-[#39ff14] font-semibold\">60+</div>
              <div className=\"label-xs text-neutral-400 mt-1\">Seed Properties</div>
            </div>
            <div className=\"border-r border-neutral-800 px-4\">
              <div className=\"font-mono-pi text-2xl text-[#39ff14] font-semibold\">6</div>
              <div className=\"label-xs text-neutral-400 mt-1\">Metro Areas</div>
            </div>
            <div className=\"px-4\">
              <div className=\"font-mono-pi text-2xl text-[#39ff14] font-semibold\">9</div>
              <div className=\"label-xs text-neutral-400 mt-1\">Export Columns</div>
            </div>
          </div>
        </div>
        <div className=\"label-xs text-neutral-500\">© PropIntel — Modeled on ATTOM, Endato, USPS NCOA, opd_21 schemas</div>
      </div>

      {/* Right form */}
      <div className=\"lg:col-span-2 bg-white p-8 sm:p-12 flex flex-col justify-center border-l border-black\">
        <div className=\"max-w-sm w-full mx-auto\" data-testid=\"login-form\">
          <div className=\"label-xs mb-2\">/ access terminal</div>
          <h2 className=\"font-display font-black uppercase text-3xl mb-8\">Sign In</h2>
          <form onSubmit={submit} className=\"space-y-5\">
            <div>
              <label className=\"label-xs block mb-2\">Email</label>
              <input data-testid=\"login-email-input\" type=\"email\" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className=\"w-full border-b border-black bg-transparent px-0 py-2 text-sm focus:outline-none focus:border-[#002fa7]\" />
            </div>
            <div>
              <label className=\"label-xs block mb-2\">Password</label>
              <input data-testid=\"login-password-input\" type=\"password\" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                className=\"w-full border-b border-black bg-transparent px-0 py-2 text-sm focus:outline-none focus:border-[#002fa7]\" />
            </div>
            {error && <div data-testid=\"login-error\" className=\"text-xs text-red-600 border border-red-500 bg-red-50 px-3 py-2\">{error}</div>}
            <button data-testid=\"login-submit-btn\" type=\"submit\" disabled={loading}
              className=\"w-full bg-black text-white py-3 text-xs font-bold uppercase tracking-[0.15em] hover:bg-neutral-800 disabled:opacity-50\">
              {loading ? \"Authenticating...\" : \"Enter Terminal\"}
            </button>
          </form>
          <div className=\"mt-8 pt-6 border-t border-neutral-300 text-xs\">
            <span className=\"text-neutral-500\">No account?</span>{\" \"}
            <Link to=\"/register\" data-testid=\"goto-register-link\" className=\"font-bold uppercase tracking-[0.1em] border-b border-black\">Create one</Link>
          </div>
          <div className=\"mt-6 p-3 bg-neutral-100 border border-neutral-300 text-[11px] font-mono-pi\" data-testid=\"demo-creds-hint\">
            <div className=\"label-xs mb-1\">/ demo</div>
            admin@propintel.io · Demo2026!
          </div>
        </div>
      </div>
    </div>
  );
}
"
