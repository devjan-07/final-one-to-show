import { useEffect, useState } from "react";
import { Save, User } from "lucide-react";
import { PageHeader, ic, lc } from "../../components/Modal";
import { normalizeTourGuideSpecialties, stakeholderGuideProfileApi, TOUR_GUIDE_LANGUAGES, TOUR_GUIDE_SPECIALTIES, stakeholdersApi, type Guide, type StakeholderProfile as Profile } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";


export function StakeholderProfile() {
  const { user } = useAuth();
  const isGuide = user?.roles.includes("TOUR_GUIDE");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [guide, setGuide] = useState<Guide | null>(null);
  const [form, setForm] = useState<Partial<Guide>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const request = isGuide ? Promise.all([stakeholdersApi.profile(), stakeholderGuideProfileApi.get().then((guide) => [guide])]) : stakeholdersApi.profile().then((value) => [value, [] as Guide[]] as const);
    request.then(([value, guides]) => {
      setProfile(value);
      const linked = guides.find((item) => item.userId === value.id || item.email?.toLowerCase() === value.email.toLowerCase()) || null;
      setGuide(linked);
      setForm(linked ? { ...linked, specialties: normalizeTourGuideSpecialties(linked.specialties) } : { name: value.fullName, email: value.email, phone: value.phone || "", profilePhoto: value.profilePhoto || "", languages: [], specialties: [], status: "Available" });
    }).catch((err) => setError(err instanceof Error ? err.message : "Could not load profile")).finally(() => setLoading(false));
  }, [isGuide]);

  const setField = <K extends keyof Guide>(key: K, value: Guide[K]) => setForm((current) => ({ ...current, [key]: value }));
  const toggle = (key: "languages" | "specialties", value: string) => { const values = form[key] || []; setField(key, values.includes(value) ? values.filter((item) => item !== value) : [...values, value]); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      const updatedProfile = await stakeholdersApi.updateProfile({ fullName: String(form.name || profile?.fullName || ""), phone: String(form.phone || ""), profilePhoto: form.profilePhoto || "" });
      if (isGuide && guide) {
        const updatedGuide = await stakeholderGuideProfileApi.update({ ...guide, ...form, name: String(form.name || guide.name), email: String(form.email || guide.email || ""), languages: form.languages || [], specialties: normalizeTourGuideSpecialties(form.specialties || []) });
        setGuide(updatedGuide); setForm(updatedGuide);
      }
      setProfile(updatedProfile); setMessage("Profile updated successfully.");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not update profile"); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="py-12 text-sm text-gray-400">Loading profile...</div>;
  return <div className="space-y-6"><PageHeader icon={User} eyebrow="Account" title="My Profile" subtitle={isGuide ? "Manage your complete Tour Guide profile" : "View and update your stakeholder profile"} />
    {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}{message && <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">{message}</div>}
    {profile && <form onSubmit={save} className="max-w-4xl space-y-6"><section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"><h2 className="font-bold text-gray-900 dark:text-white">Personal Information</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><label><span className={lc}>Full Name</span><input className={ic} value={String(form.name || "")} onChange={(e) => setField("name", e.target.value)} required /></label><label><span className={lc}>Email Address</span><input className={`${ic} opacity-70`} value={String(form.email || profile.email)} readOnly /></label><label><span className={lc}>Phone Number</span><input className={ic} value={String(form.phone || "")} onChange={(e) => setField("phone", e.target.value)} /></label><label><span className={lc}>Nationality</span><input className={ic} value={String(form.nationality || "")} onChange={(e) => setField("nationality", e.target.value)} /></label><label className="md:col-span-2"><span className={lc}>Profile Photo</span><input type="file" accept="image/*" className={ic} onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = () => setField("profilePhoto", String(reader.result)); reader.readAsDataURL(file); } }} /></label></div></section>
      {isGuide && <><section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"><h2 className="font-bold text-gray-900 dark:text-white">Professional Information</h2><div className="mt-4 space-y-5"><div><span className={lc}>Languages</span><div className="flex flex-wrap gap-2">{TOUR_GUIDE_LANGUAGES.map((item) => <button type="button" key={item} onClick={() => toggle("languages", item)} className="rounded-full border px-3 py-1.5 text-xs font-semibold" style={{ background: form.languages?.includes(item) ? "#0057B8" : "#f3f4f6", color: form.languages?.includes(item) ? "white" : "#374151" }}>{item}</button>)}</div></div><div className="grid gap-4 md:grid-cols-2"><label><span className={lc}>Years of Experience</span><input type="number" min="0" className={ic} value={form.experience ?? 0} onChange={(e) => setField("experience", Number(e.target.value))} /></label><label><span className={lc}>Price Per Day (LKR)</span><input type="number" min="0" className={ic} value={form.pricePerDay ?? 0} onChange={(e) => setField("pricePerDay", Number(e.target.value))} /></label></div><div><span className={lc}>Specialties</span><div className="flex flex-wrap gap-2">{TOUR_GUIDE_SPECIALTIES.map((item) => <button type="button" key={item} onClick={() => toggle("specialties", item)} className="rounded-full border px-3 py-1.5 text-xs font-semibold" style={{ background: form.specialties?.includes(item) ? "#FF385C" : "#f3f4f6", color: form.specialties?.includes(item) ? "white" : "#374151" }}>{item}</button>)}</div></div><label><span className={lc}>Primary Location / Operating Area</span><input className={ic} value={String(form.location || "")} onChange={(e) => setField("location", e.target.value)} /></label><label><span className={lc}>Short Bio</span><textarea rows={4} className={ic} value={String(form.bio || "")} onChange={(e) => setField("bio", e.target.value)} /></label></div></section><section className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-800"><h2 className="font-bold text-gray-900 dark:text-white">Availability & Access</h2><div className="mt-4 grid gap-4 md:grid-cols-2"><label><span className={lc}>Current Status</span><select className={ic} value={String(form.status || "Available")} onChange={(e) => setField("status", e.target.value as Guide["status"])}><option>Available</option><option>Unavailable</option><option>On Leave</option></select></label><label><span className={lc}>Stakeholder Type</span><input className={`${ic} opacity-70`} value="Tour Guide" readOnly /></label><label><span className={lc}>Access Profile</span><input className={`${ic} opacity-70`} value="TOUR_GUIDE" readOnly /></label></div><p className="mt-3 text-xs text-gray-400">Permissions are managed through Access Control.</p></section></>}
      <button disabled={saving} className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60" style={{ background: "#0057B8" }}><Save className="h-4 w-4" />{saving ? "Saving..." : "Save profile"}</button>
    </form>}
  </div>;
}
