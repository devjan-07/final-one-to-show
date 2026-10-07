import { useState, useRef, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router";
import { Globe, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowLeft, User, CheckCircle, ShieldCheck, RotateCcw } from "lucide-react";
import { useAuth } from "../context/AuthContext";

import bgImage from "../../imports/image-8.png";
const inp = "w-full py-3 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition-all bg-white";
const nationalities = ["Sri Lankan", "Indian", "British", "Australian", "American", "Canadian", "German", "French", "Italian", "Japanese", "Chinese", "Singaporean", "Maldivian", "Other"];
const countries = ["Sri Lanka", "India", "United Kingdom", "Australia", "United States", "Canada", "Germany", "France", "Italy", "Japan", "China", "Singapore", "Maldives", "Other"];
const languageOptions = ["English", "Sinhala", "Tamil", "Hindi", "French", "German", "Spanish", "Italian", "Japanese", "Mandarin", "Arabic"];

function OtpInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const handleKey = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !value[i] && i > 0) refs.current[i - 1]?.focus();
  };

  const handleChange = (i: number, raw: string) => {
    const digit = raw.replace(/\D/, "").slice(-1);
    const next = [...value];
    next[i] = digit;
    onChange(next);
    if (digit && i < 5) refs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    const next = Array(6).fill("").map((_, i) => pasted[i] ?? "");
    onChange(next);
    refs.current[Math.min(pasted.length, 5)]?.focus();
    e.preventDefault();
  };

  return (
    <div className="flex gap-3 justify-center">
      {value.map((digit, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKey(i, e)}
          onPaste={handlePaste}
          className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all"
          style={{
            borderColor: digit ? "#FF385C" : "#e5e7eb",
            background: digit ? "#fff5f7" : "white",
            color: "#111",
          }}
        />
      ))}
    </div>
  );
}

export default function LoginPage() {
  const { login, signup, verifyEmail, resendVerificationCode, authError } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState<"login" | "signup" | "verify">(
    searchParams.get("mode") === "signup" ? "signup" : "login"
  );
  const redirectTo = safeRedirect(searchParams.get("redirect"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+94 ");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [nationality, setNationality] = useState("");
  const [countryOfResidence, setCountryOfResidence] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // OTP state
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""));
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const switchMode = (m: "login" | "signup") => {
    setMode(m); setError("");
    setName(""); setEmail(""); setPhone("+94 "); setPassword(""); setConfirm(""); setNationality(""); setCountryOfResidence(""); setLanguages([]); setTermsAccepted(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (mode === "login") {
      if (!email.trim() || !password) { setError("Please enter your email and password."); return; }
      setLoading(true);
      await new Promise((r) => setTimeout(r, 700));
      const ok = await login(email, password);
      setLoading(false);
      if (ok) {
        const raw = sessionStorage.getItem("voyara_user");
        const roles = raw ? JSON.parse(raw).roles || [] : [];
        const permissions = raw ? JSON.parse(raw).permissions || [] : [];
        if (roles.includes("ADMIN") || permissions.length > 0) navigate("/dashboard", { replace: true });
        else if (roles.includes("TOURIST")) navigate(redirectTo || "/tourist/dashboard", { replace: true });
        else navigate("/stakeholder/profile", { replace: true });
      }
      else setError("");
    } else {
      if (!name.trim()) { setError("Please enter your full name."); return; }
      if (!email) { setError("Please enter your email address."); return; }
      if (!/^\+94\s?[0-9]{9}$/.test(phone.trim())) { setError("Please enter a valid +94 phone number."); return; }
      if (!nationality) { setError("Please select your nationality."); return; }
      if (!countryOfResidence) { setError("Please select your country of residence."); return; }
      if (languages.length === 0) { setError("Please select at least one preferred language."); return; }
      if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
      if (password !== confirm) { setError("Passwords do not match."); return; }
      if (!termsAccepted) { setError("Please accept the Terms of Service and Privacy Policy."); return; }
      setLoading(true);
      const ok = await signup(name.trim(), email, password, { phone: phone.trim(), nationality, countryOfResidence, languages, termsAccepted });
      setLoading(false);
      if (ok) {
        setOtp(Array(6).fill(""));
        setResendCooldown(60);
        setMode("verify");
      } else {
        setError("");
      }
    }
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length < 6) { setError("Please enter all 6 digits."); return; }
    setError("");
    setLoading(true);
    const ok = await verifyEmail(email, code);
    setLoading(false);
    if (ok) {
      setDone(true);
      setTimeout(() => navigate(redirectTo || "/tourist/dashboard", { replace: true }), 2000);
    } else {
      setError("");
      setOtp(Array(6).fill(""));
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setOtp(Array(6).fill(""));
    setError("");
    const ok = await resendVerificationCode(email);
    if (ok) {
      setResendCooldown(60);
    } else {
      setError("");
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden">
        <img src={bgImage} alt="Sri Lanka travel" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(15,23,42,0.75) 0%, rgba(255,56,92,0.35) 100%)" }} />
        <div className="relative flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FF385C, #E31C5F)" }}>
            <Globe className="w-5 h-5 text-white" />
          </div>
          <span style={{ color: "white", fontWeight: 800, fontSize: "1.4rem", letterSpacing: "-0.5px" }}>Voyara</span>
        </div>
        <div className="relative">
          <p className="text-white/90 mb-4" style={{ fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.25 }}>
            "Sri Lanka is waiting,<br />from ancient cities<br />to golden coastlines."
          </p>
          <p className="text-white/50 text-sm">Voyara travel experiences</p>
          <div className="mt-8 flex items-center gap-4">
            {[{ value: "50+", label: "Tours" }, { value: "25+", label: "Places" }, { value: "2k+", label: "Travelers" }].map((s) => (
              <div key={s.label} className="px-4 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.15)" }}>
                <p className="text-white font-bold">{s.value}</p>
                <p className="text-white/60 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12" style={{ background: "#f9fafb" }}>
        <div className="flex lg:hidden items-center gap-2 mb-10">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #FF385C, #E31C5F)" }}>
            <Globe className="w-4 h-4 text-white" />
          </div>
          <span style={{ color: "#FF385C", fontWeight: 800, fontSize: "1.25rem" }}>Voyara</span>
        </div>

        <div className="w-full max-w-md">
          {done ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#dcfce7" }}>
                <CheckCircle className="w-8 h-8" style={{ color: "#16a34a" }} />
              </div>
              <h2 className="text-gray-900 font-bold text-2xl mb-2">Account Created!</h2>
              <p className="text-gray-500 text-sm">Welcome to Voyara. Taking you home…</p>
            </div>
          ) : mode === "verify" ? (
            <div>
              {/* Verify header */}
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #FF385C, #E31C5F)" }}>
                  <ShieldCheck className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-gray-900 mb-1" style={{ fontWeight: 800, fontSize: "1.75rem" }}>Check your email</h1>
                <p className="text-gray-500 text-sm">We sent a 6-digit verification code to</p>
                <p className="font-semibold text-gray-800 text-sm mt-0.5">{email}</p>
              </div>

              {/* Verification hint */}
              <div className="flex items-start gap-3 p-4 rounded-2xl mb-6" style={{ background: "#f0f9ff", border: "1px solid #bae6fd" }}>
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#0284c7" }} />
                <div className="text-xs" style={{ color: "#0369a1" }}>
                  <p className="font-semibold mb-0.5">Email verification</p>
                  <p>Enter the 6-digit code sent to your email. The code expires soon.</p>
                </div>
              </div>

              {(error || authError) && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-xl mb-5" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                  <AlertCircle className="w-4 h-4 shrink-0" style={{ color: "#dc2626" }} />
                  <p className="text-sm" style={{ color: "#dc2626" }}>{error || authError}</p>
                </div>
              )}

              {/* OTP boxes */}
              <div className="mb-6">
                <OtpInput value={otp} onChange={setOtp} />
              </div>

              {/* Verify button */}
              <button onClick={handleVerify} disabled={loading}
                className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
                style={{ background: loading ? "#9ca3af" : "linear-gradient(135deg, #FF385C, #E31C5F)" }}>
                {loading ? (
                  <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>Verifying…</>
                ) : <><ShieldCheck className="w-4 h-4" /> Verify & Create Account</>}
              </button>

              {/* Resend + back */}
              <div className="mt-5 flex items-center justify-between text-sm">
                <button onClick={() => { setMode("signup"); setError(""); }}
                  className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors">
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button onClick={handleResend} disabled={resendCooldown > 0}
                  className="inline-flex items-center gap-1.5 font-semibold transition-colors"
                  style={{ color: resendCooldown > 0 ? "#9ca3af" : "#FF385C" }}>
                  <RotateCcw className="w-3.5 h-3.5" />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Mode tabs */}
              <div className="flex rounded-2xl p-1 mb-8" style={{ background: "#f0f0f5" }}>
                {(["login", "signup"] as const).map((m) => (
                  <button key={m} onClick={() => switchMode(m)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{ background: mode === m ? "white" : "transparent", color: mode === m ? "#111" : "#6b7280", boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
                    {m === "login" ? "Log In" : "Sign Up"}
                  </button>
                ))}
              </div>

              <div className="mb-6">
                <h1 className="text-gray-900 mb-1" style={{ fontWeight: 800, fontSize: "1.75rem" }}>
                  {mode === "login" ? "Welcome back" : "Create an account"}
                </h1>
                <p className="text-gray-500 text-sm">
                  {mode === "login" ? "Sign in to continue your Voyara journey" : "Create your tourist account for Sri Lanka trips"}
                </p>
              </div>

              {mode === "login" && (
                <div className="flex items-start gap-3 p-4 rounded-2xl mb-6" style={{ background: "#f0f9ff", border: "1px solid #bae6fd" }}>
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "#0284c7" }} />
                  <div className="text-xs" style={{ color: "#0369a1" }}>
                    <p className="font-semibold mb-1">Secure login</p>
                    <p>Use the email and password registered in Voyara.</p>
                  </div>
                </div>
              )}

              {(error || authError) && (
                <div className="flex items-center gap-2.5 p-3.5 rounded-xl mb-5" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                  <AlertCircle className="w-4 h-4 shrink-0" style={{ color: "#dc2626" }} />
                  <p className="text-sm" style={{ color: "#dc2626" }}>{error || authError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="text" placeholder="Jane Smith" value={name} onChange={(e) => setName(e.target.value)} className={`${inp} pl-10 pr-4`} />
                    </div>
                  </div>
                )}
                {mode === "signup" && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Nationality</label>
                      <select value={nationality} onChange={(e) => setNationality(e.target.value)} className={inp}>
                        <option value="">Select your nationality</option>
                        {nationalities.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Country of Residence</label>
                      <select value={countryOfResidence} onChange={(e) => setCountryOfResidence(e.target.value)} className={inp}>
                        <option value="">Select your country</option>
                        {countries.map((option) => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Preferred Languages</label>
                      <div className="flex flex-wrap gap-2">
                        {languageOptions.map((option) => {
                          const selected = languages.includes(option);
                          return <button key={option} type="button" aria-pressed={selected} onClick={() => setLanguages((items) => selected ? items.filter((item) => item !== option) : [...items, option])} className="rounded-full border px-3 py-2 text-xs font-semibold transition-colors" style={{ borderColor: selected ? "#FF385C" : "#d1d5db", background: selected ? "#fff0f3" : "white", color: selected ? "#FF385C" : "#6b7280" }}>{option}</button>;
                        })}
                      </div>
                    </div>
                  </>
                )}
                {mode === "signup" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Phone Number</label>
                    <input type="tel" inputMode="tel" placeholder="+94 712345678" value={phone} onChange={(e) => setPhone(e.target.value)} className={`${inp} px-4`} />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inp} pl-10 pr-4`} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type={showPass ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} placeholder="••••••••" minLength={mode === "signup" ? 8 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} className={`${inp} pl-10 pr-12`} />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {mode === "signup" && <p className="mt-1.5 text-xs text-gray-400">Minimum 8 characters</p>}
                </div>
                {mode === "signup" && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type={showPass ? "text" : "password"} autoComplete="new-password" placeholder="••••••••" value={confirm} onChange={(e) => setConfirm(e.target.value)} className={`${inp} pl-10 pr-4`} />
                    </div>
                  </div>
                )}
                {mode === "signup" && (
                  <label className="flex items-start gap-2.5 text-sm text-gray-600">
                    <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 accent-rose-500" />
                    <span>I agree to the <Link to="/help" className="font-semibold text-gray-800 underline">Terms of Service</Link> and <Link to="/help" className="font-semibold text-gray-800 underline">Privacy Policy</Link></span>
                  </label>
                )}
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity hover:opacity-90 mt-2 flex items-center justify-center gap-2"
                  style={{ background: loading ? "#9ca3af" : "linear-gradient(135deg, #FF385C, #E31C5F)" }}>
                  {loading ? (
                    <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>{mode === "login" ? "Signing in…" : "Creating account…"}</>
                  ) : mode === "login" ? "Sign In" : "Create Account"}
                </button>
              </form>

              <div className="mt-8 text-center">
                <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Back to Voyara
                </Link>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}

function safeRedirect(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "";
  return value;
}
