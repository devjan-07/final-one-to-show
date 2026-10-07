import { useState } from "react";
import { Link } from "react-router";
import { ChevronRight, ChevronLeft, CheckCircle, MapPin, Clock, Users, FileText, Tag, Globe, CheckSquare } from "lucide-react";
import { RupeeIcon } from "../components/Modal";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";

const inp = "w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 transition-all bg-white";
const lbl = "block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide";

function FieldError({ msg }: { msg?: string }) {
  return msg ? <p className="text-xs text-rose-500 mt-1.5">{msg}</p> : null;
}

const steps = ["Basic Info", "Tour Details", "Review & Submit"];

export default function ListTourPage() {
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errs, setErrs] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    title: "", category: "", location: "", language: "",
    duration: "", price: "", maxGroup: "", difficulty: "", description: "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const validate1 = () => {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Tour title is required.";
    if (!form.category) e.category = "Please select a category.";
    if (!form.location.trim()) e.location = "Location is required.";
    if (!form.language) e.language = "Please select a language.";
    return e;
  };

  const validate2 = () => {
    const e: Record<string, string> = {};
    if (!form.duration.trim()) e.duration = "Duration is required.";
    if (!form.price || isNaN(Number(form.price))) e.price = "Enter a valid price.";
    if (!form.maxGroup || isNaN(Number(form.maxGroup))) e.maxGroup = "Enter a valid group size.";
    if (!form.difficulty) e.difficulty = "Please select a difficulty.";
    if (!form.description.trim()) e.description = "Please add a description.";
    return e;
  };

  const next = () => {
    const e = step === 1 ? validate1() : validate2();
    if (Object.keys(e).length) { setErrs(e); return; }
    setErrs({});
    setStep((s) => s + 1);
  };

  const back = () => { setErrs({}); setStep((s) => s - 1); };

  const submit = () => {
    if (!agreed) { setErrs({ agreed: "You must agree to the guidelines." }); return; }
    setSubmitted(true);
  };

  const summaryRows = [
    { icon: FileText, label: "Title", value: form.title },
    { icon: Tag, label: "Category", value: form.category },
    { icon: MapPin, label: "Location", value: form.location },
    { icon: Globe, label: "Language", value: form.language },
    { icon: Clock, label: "Duration", value: form.duration },
    { icon: RupeeIcon, label: "Price per person", value: form.price ? `රු${form.price}` : "" },
    { icon: Users, label: "Max group size", value: form.maxGroup ? `${form.maxGroup} people` : "" },
    { icon: CheckSquare, label: "Difficulty", value: form.difficulty },
  ];

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {submitted ? (
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: "#dcfce7" }}>
            <CheckCircle className="w-10 h-10" style={{ color: "#16a34a" }} />
          </div>
          <h1 className="text-gray-900 mb-3" style={{ fontWeight: 800, fontSize: "1.75rem" }}>Tour Submitted for Review!</h1>
          <p className="text-gray-500 text-sm mb-2 max-w-sm">Our team will review your submission within 48 hours. You will receive a confirmation email once approved.</p>
          <p className="text-gray-400 text-xs mb-8">Submitted as: <span className="font-mono">{form.title}</span></p>
          <div className="flex gap-3">
            <Link to="/" className="px-6 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #FF385C, #E31C5F)" }}>
              Back to Home
            </Link>
            <button onClick={() => { setSubmitted(false); setStep(1); setAgreed(false); setForm({ title: "", category: "", location: "", language: "", duration: "", price: "", maxGroup: "", difficulty: "", description: "" }); }}
              className="px-6 py-3 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors">
              Submit Another
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto px-4 py-14">
          {/* Header */}
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest mb-2" style={{ color: "#FF385C" }}>Become a Host</p>
            <h1 className="text-gray-900" style={{ fontWeight: 800, fontSize: "2rem" }}>List Your Tour</h1>
            <p className="text-gray-500 text-sm mt-2">Share your expertise with travelers from around the world.</p>
          </div>

          {/* Progress */}
          <div className="flex items-center mb-10">
            {steps.map((label, i) => {
              const n = i + 1;
              const done = step > n;
              const active = step === n;
              return (
                <div key={label} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                      style={{
                        background: done ? "#FF385C" : active ? "white" : "#f3f4f6",
                        color: done ? "white" : active ? "#FF385C" : "#9ca3af",
                        border: active ? "2px solid #FF385C" : done ? "2px solid #FF385C" : "2px solid #e5e7eb",
                      }}>
                      {done ? <CheckCircle className="w-4 h-4" /> : n}
                    </div>
                    <span className="text-xs font-medium whitespace-nowrap" style={{ color: active ? "#FF385C" : done ? "#111" : "#9ca3af" }}>{label}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="flex-1 h-0.5 mx-2 mb-5" style={{ background: step > n ? "#FF385C" : "#e5e7eb" }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step content */}
          <div className="rounded-2xl p-8" style={{ border: "1px solid #e5e7eb", background: "#fafafa" }}>
            {step === 1 && (
              <div className="space-y-5">
                <h2 className="font-bold text-gray-900 text-lg mb-6">Basic Information</h2>
                <div>
                  <label className={lbl}>Tour Title</label>
                  <input type="text" placeholder="e.g. Hidden Gems of Old Galle" value={form.title} onChange={(e) => set("title", e.target.value)} className={inp} />
                  <FieldError msg={errs.title} />
                </div>
                <div>
                  <label className={lbl}>Category</label>
                  <select value={form.category} onChange={(e) => set("category", e.target.value)} className={inp}>
                    <option value="">Select a category…</option>
                    {["City Tours", "Beaches", "Hiking", "Food & Drink", "Water Sports", "Cultural", "Nature", "Nightlife", "Photography", "Wellness", "Wildlife", "Aerial"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <FieldError msg={errs.category} />
                </div>
                <div>
                  <label className={lbl}>Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="e.g. Galle, Sri Lanka" value={form.location} onChange={(e) => set("location", e.target.value)} className={`${inp} pl-10`} />
                  </div>
                  <FieldError msg={errs.location} />
                </div>
                <div>
                  <label className={lbl}>Tour Language</label>
                  <select value={form.language} onChange={(e) => set("language", e.target.value)} className={inp}>
                    <option value="">Select language…</option>
                    {["English", "Spanish", "French", "Japanese", "Mandarin", "Portuguese", "Arabic", "German"].map((l) => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                  <FieldError msg={errs.language} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <h2 className="font-bold text-gray-900 text-lg mb-6">Tour Details</h2>
                <div>
                  <label className={lbl}>Duration</label>
                  <div className="relative">
                    <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="e.g. 4 hours" value={form.duration} onChange={(e) => set("duration", e.target.value)} className={`${inp} pl-10`} />
                  </div>
                  <FieldError msg={errs.duration} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={lbl}>Price per Person (LKR)</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">රු</span>
                      <input type="number" min="1" placeholder="85" value={form.price} onChange={(e) => set("price", e.target.value)} className={`${inp} pl-10`} />
                    </div>
                    <FieldError msg={errs.price} />
                  </div>
                  <div>
                    <label className={lbl}>Max Group Size</label>
                    <div className="relative">
                      <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input type="number" min="1" placeholder="12" value={form.maxGroup} onChange={(e) => set("maxGroup", e.target.value)} className={`${inp} pl-10`} />
                    </div>
                    <FieldError msg={errs.maxGroup} />
                  </div>
                </div>
                <div>
                  <label className={lbl}>Difficulty Level</label>
                  <select value={form.difficulty} onChange={(e) => set("difficulty", e.target.value)} className={inp}>
                    <option value="">Select difficulty…</option>
                    {["Easy", "Moderate", "Challenging"].map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <FieldError msg={errs.difficulty} />
                </div>
                <div>
                  <label className={lbl}>Tour Description</label>
                  <textarea
                    placeholder="Describe the tour experience, highlights, what to expect, and what is included…"
                    value={form.description}
                    onChange={(e) => set("description", e.target.value)}
                    rows={5}
                    className={`${inp} resize-none`}
                    style={{ minHeight: "120px" }}
                  />
                  <FieldError msg={errs.description} />
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="font-bold text-gray-900 text-lg mb-6">Review Your Submission</h2>
                <div className="rounded-xl overflow-hidden mb-6" style={{ border: "1px solid #e5e7eb" }}>
                  {summaryRows.map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-start gap-3 px-5 py-3.5" style={{ borderBottom: "1px solid #f5f5f5" }}>
                      <Icon className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">{label}</p>
                        <p className="text-sm text-gray-800 font-medium mt-0.5">{value || <span className="text-gray-300">—</span>}</p>
                      </div>
                    </div>
                  ))}
                  {form.description && (
                    <div className="px-5 py-3.5">
                      <div className="flex items-start gap-3">
                        <FileText className="w-4 h-4 shrink-0 mt-0.5 text-gray-400" />
                        <div>
                          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Description</p>
                          <p className="text-sm text-gray-800 mt-0.5 leading-relaxed">{form.description}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={agreed} onChange={(e) => { setAgreed(e.target.checked); setErrs({}); }}
                    className="mt-0.5 accent-rose-500 w-4 h-4 rounded shrink-0" />
                  <span className="text-sm text-gray-600 leading-relaxed">
                    I confirm that this tour meets{" "}
                    <span className="font-semibold" style={{ color: "#FF385C" }}>Voyara's quality guidelines</span> and that all information provided is accurate and up to date.
                  </span>
                </label>
                <FieldError msg={errs.agreed} />
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-6">
            {step > 1 ? (
              <button onClick={back} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <div />
            )}
            {step < 3 ? (
              <button onClick={next} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #FF385C, #E31C5F)" }}>
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={submit} className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #FF385C, #E31C5F)" }}>
                <CheckCircle className="w-4 h-4" /> Submit Tour
              </button>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
