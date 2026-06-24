import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Database } from "lucide-react";

export default function RegisterPage() {
  const { register, error } = useAuth();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const ok = await register(email, password, name);
    setLoading(false);
    if (ok) nav("/dashboard");
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-white p-6">
      <div className="w-full max-w-md border border-black" data-testid="register-card">
        <div className="p-6 border-b border-black flex items-center gap-2 bg-[#0a0a0a] text-white">
          <Database className="w-5 h-5" strokeWidth={1.5}/>
          <span className="font-display font-black uppercase">PropIntel</span>
        </div>
        <div className="p-8">
          <div className="label-xs mb-2">/ new analyst</div>
          <h2 className="font-display font-black uppercase text-2xl mb-6">Create Account</h2>
          <form onSubmit={submit} className="space-y-5" data-testid="register-form">
            <div>
              <label className="label-xs block mb-2">Full Name</label>
              <input data-testid="register-name-input" type="text" value={name} onChange={(e)=>setName(e.target.value)}
                className="w-full border-b border-black bg-transparent px-0 py-2 text-sm focus:outline-none focus:border-[#002fa7]" />
            </div>
            <div>
              <label className="label-xs block mb-2">Email</label>
              <input data-testid="register-email-input" type="email" required value={email} onChange={(e)=>setEmail(e.target.value)}
                className="w-full border-b border-black bg-transparent px-0 py-2 text-sm focus:outline-none focus:border-[#002fa7]" />
            </div>
            <div>
              <label className="label-xs block mb-2">Password</label>
              <input data-testid="register-password-input" type="password" required minLength={6} value={password} onChange={(e)=>setPassword(e.target.value)}
                className="w-full border-b border-black bg-transparent px-0 py-2 text-sm focus:outline-none focus:border-[#002fa7]" />
            </div>
            {error && <div data-testid="register-error" className="text-xs text-red-600 border border-red-500 bg-red-50 px-3 py-2">{error}</div>}
            <button data-testid="register-submit-btn" type="submit" disabled={loading}
              className="w-full bg-black text-white py-3 text-xs font-bold uppercase tracking-[0.15em] hover:bg-neutral-800 disabled:opacity-50">
              {loading ? "Creating..." : "Create Account"}
            </button>
          </form>
          <div className="mt-6 pt-4 border-t border-neutral-300 text-xs">
            <span className="text-neutral-500">Have an account?</span>{" "}
            <Link to="/login" data-testid="goto-login-link" className="font-bold uppercase tracking-[0.1em] border-b border-black">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

