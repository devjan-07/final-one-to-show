import { useEffect, useState } from "react";
import { Plus, Search, Edit2, Trash2, UserCheck, Star, MapPin, Filter, Briefcase, Clock, Globe, Mail } from "lucide-react";
import { Modal, ConfirmDialog, StatCard, PageHeader, ic, lc } from "../../components/Modal";
import { adminGuidesApi, normalizeTourGuideSpecialties, TOUR_GUIDE_LANGUAGES, TOUR_GUIDE_SPECIALTIES, type Guide } from "../../lib/api";

const statusList = ["Available", "Unavailable", "On Leave"];
const statusStyle: Record<string, { bg: string; color: string; dot: string }> = {
  Available: { bg: "#f0fdf4", color: "#16a34a", dot: "#16a34a" },
  Unavailable: { bg: "#f3f4f6", color: "#6b7280", dot: "#9ca3af" },
  "On Leave": { bg: "#fffbeb", color: "#d97706", dot: "#f59e0b" },
  Busy: { bg: "#fffbeb", color: "#d97706", dot: "#f59e0b" },
  Offline: { bg: "#f3f4f6", color: "#6b7280", dot: "#9ca3af" },
};

export function GuideManagement() {
  const [items, setItems] = useState<Guide[]>([]);
  const [search, setSearch] = useState("");
  const [fStatus, setFStatus] = useState("All");
  const [fSpec, setFSpec] = useState("All");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Guide | null>(null);
  const [form, setForm] = useState<Partial<Guide>>({});
  const [delId, setDelId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminGuidesApi.list().then(setItems).catch((error) => setError(error instanceof Error ? error.message : "Failed to load guides"));
  }, []);

  const filtered = items.filter((g) =>
    (g.name.toLowerCase().includes(search.toLowerCase()) || g.location.toLowerCase().includes(search.toLowerCase())) &&
    (fStatus === "All" || g.status === fStatus) && (fSpec === "All" || g.specialties.includes(fSpec))
  );

  const openAdd = () => { setEdit(null); setForm({}); setOpen(true); };
  const openEdit = (g: Guide) => { setEdit(g); setForm({ ...g, specialties: normalizeTourGuideSpecialties(g.specialties) }); setOpen(true); };
  const toggleSpec = (s: string) => { const a = form.specialties || []; setForm({ ...form, specialties: a.includes(s) ? a.filter(x => x !== s) : [...a, s] }); };
  const toggleLang = (l: string) => { const a = form.languages || []; setForm({ ...form, languages: a.includes(l) ? a.filter(x => x !== l) : [...a, l] }); };
  const save = async () => {
    if (!form.name || !form.email) return;
    setError("");
    const payload = { reviews: form.reviews ?? 0, toursCompleted: form.toursCompleted ?? 0, rating: form.rating ?? 0, color: form.color || "#6b7280", specialties: normalizeTourGuideSpecialties(form.specialties || []), languages: form.languages || [], bio: form.bio || "", name: form.name!, email: form.email, phone: form.phone || "", nationality: form.nationality || "", profilePhoto: form.profilePhoto || "", initials: form.initials || form.name!.split(" ").map(n=>n[0]).join("").slice(0,2), location: form.location || "", country: form.country || "", pricePerDay: form.pricePerDay || 0, experience: form.experience || 0, status: form.status || "Available" };
    try {
      if (edit) {
        const saved = await adminGuidesApi.update(edit.id, payload);
        setItems(items.map(i => i.id === edit.id ? saved : i));
      } else {
        const saved = await adminGuidesApi.create(payload);
        setItems([saved, ...items]);
      }
      setOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to save guide");
    }
  };
  const del = async () => {
    if (!delId) return;
    setError("");
    try {
      await adminGuidesApi.remove(delId);
      setItems(items.filter(i => i.id !== delId));
      setDelId(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to delete guide");
    }
  };

  const available = items.filter(g => g.status === "Available").length;

  return (
    <div>
      <PageHeader icon={UserCheck} title="Tour Guides" subtitle="Manage guide profiles, availability and ratings" actionLabel="Add Guide" onAction={openAdd} />
      {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={UserCheck} label="Total Guides" value={items.length} bg="#fff0f3" color="#FF385C" />
        <StatCard icon={Globe} label="Available Now" value={available} bg="#f0fdf4" color="#16a34a" />
        <StatCard icon={Star} label="Avg Rating" value={items.length ? (items.reduce((s,g) => s+g.rating, 0)/items.length).toFixed(2) : "0.00"} bg="#f0f9ff" color="#0284c7" />
        <StatCard icon={Briefcase} label="Tours Completed" value={items.reduce((s,g) => s+g.toursCompleted, 0).toLocaleString()} bg="#fefce8" color="#ca8a04" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
          <input className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 placeholder:text-gray-400 dark:placeholder:text-slate-500 text-sm focus:outline-none" placeholder="Search guides..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Filter className="w-4 h-4 text-gray-400 dark:text-slate-500 self-center shrink-0" />
          <select className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-700 dark:text-slate-300" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option>All</option>{statusList.map(s => <option key={s}>{s}</option>)}
          </select>
          <select className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-700 dark:text-slate-300" value={fSpec} onChange={(e) => setFSpec(e.target.value)}>
            <option value="All">All Specialties</option>{TOUR_GUIDE_SPECIALTIES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((g) => {
          const ss = statusStyle[g.status];
          return (
            <div key={g.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 hover:shadow-lg transition-all border border-gray-200 dark:border-slate-700">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {g.profilePhoto ? <img src={g.profilePhoto} alt="" className="w-12 h-12 rounded-2xl object-cover shrink-0" /> : <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shrink-0" style={{ background: g.color }}>{g.initials}</div>}
                  <div>
                    <h3 className="font-bold text-gray-900 dark:text-white" style={{ fontSize: "0.95rem" }}>{g.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500"><MapPin className="w-3 h-3" />{g.location}, {g.country}</div>
                    {g.email && <div className="mt-1 flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500"><Mail className="w-3 h-3" />{g.email}</div>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full shrink-0" style={{ background: ss.bg }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: ss.dot }} />
                  <span className="text-xs font-semibold" style={{ color: ss.color }}>{g.status}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <Star className="w-3.5 h-3.5" style={{ fill: "#FF385C", color: "#FF385C" }} />
                <span className="text-sm font-bold dark:text-white">{g.rating}</span>
                <span className="text-xs text-gray-400 dark:text-slate-500">({g.reviews.toLocaleString()} reviews)</span>
              </div>

              <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed mb-3" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{g.bio}</p>

              <div className="flex flex-wrap gap-1.5 mb-2">
                {g.specialties.slice(0, 3).map(s => <span key={s} className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: "#fff0f3", color: "#FF385C" }}>{s}</span>)}
                {g.specialties.length > 3 && <span className="text-xs text-gray-400 dark:text-slate-500">+{g.specialties.length - 3}</span>}
              </div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {g.languages.slice(0, 3).map(l => <span key={l} className="px-2 py-0.5 rounded-full text-xs" style={{ background: "#f0f9ff", color: "#0284c7" }}>{l}</span>)}
                {g.languages.length > 3 && <span className="text-xs text-gray-400 dark:text-slate-500">+{g.languages.length - 3}</span>}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-700">
                <div className="flex gap-3 text-xs text-gray-400 dark:text-slate-500">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{g.experience}yr exp</span>
                  <span className="flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" />{g.toursCompleted}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold dark:text-white">රු{g.pricePerDay}<span className="text-xs font-normal text-gray-400 dark:text-slate-500">/day</span></span>
                  <button onClick={() => openEdit(g)} className="p-1.5 rounded-lg hover:bg-blue-50" style={{ color: "#3b82f6" }}><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => setDelId(g.id)} className="p-1.5 rounded-lg hover:bg-red-50" style={{ color: "#ef4444" }}><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          );
        })}
        {!filtered.length && <div className="col-span-3 py-16 text-center text-gray-400 dark:text-slate-500"><UserCheck className="w-10 h-10 mx-auto mb-2 opacity-25" /><p>No guides found</p></div>}
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={edit ? "Edit Guide" : "Add New Guide"} subtitle="Manage guide profile details">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lc}>Full Name</label><input className={ic} placeholder="Antoine Dubois" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className={lc}>Initials (2 chars)</label><input className={ic} maxLength={2} placeholder="AD" value={form.initials || ""} onChange={(e) => setForm({ ...form, initials: e.target.value.toUpperCase() })} /></div>
          </div>
          <div><label className={lc}>Email</label><input type="email" required className={ic} placeholder="guide@example.com" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /><span className="mt-1 block text-xs text-gray-400">This email creates or links the guide's stakeholder login.</span></div>
          <div><label className={lc}>Phone</label><input type="tel" pattern="^[+]?[0-9][0-9 ()-]{6,19}$" title="Enter a valid phone number" className={ic} placeholder="+94 77 123 4567" value={form.phone || ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3"><div><label className={lc}>Nationality</label><input className={ic} placeholder="Sri Lankan" value={form.nationality || ""} onChange={(e) => setForm({ ...form, nationality: e.target.value })} /></div><div><label className={lc}>Profile Photo</label><input type="file" accept="image/*" className={ic} onChange={(e) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = () => setForm({ ...form, profilePhoto: String(reader.result) }); reader.readAsDataURL(file); } }} /></div></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lc}>City</label><input className={ic} placeholder="Galle" value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div><label className={lc}>Country</label><input className={ic} placeholder="Sri Lanka" value={form.country || ""} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lc}>Price/Day (රු)</label><input type="number" className={ic} placeholder="120" value={form.pricePerDay || ""} onChange={(e) => setForm({ ...form, pricePerDay: +e.target.value })} /></div>
            <div><label className={lc}>Experience (yrs)</label><input type="number" className={ic} placeholder="9" value={form.experience || ""} onChange={(e) => setForm({ ...form, experience: +e.target.value })} /></div>
            <div><label className={lc}>Status</label>
              <select className={ic} value={form.status || ""} onChange={(e) => setForm({ ...form, status: e.target.value as Guide["status"] })}>
                <option value="">Select</option>{statusList.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div><label className={lc}>Specialties</label>
            <div className="flex flex-wrap gap-2 mt-1">{Array.from(new Set([...TOUR_GUIDE_SPECIALTIES, ...(form.specialties || [])])).map(s => { const on = (form.specialties||[]).includes(s); return <button key={s} type="button" onClick={() => toggleSpec(s)} className="px-3 py-1.5 rounded-full text-xs font-medium transition-all" style={{ background: on ? "#FF385C" : "#f3f4f6", color: on ? "white" : "#374151", border: on ? "1px solid #FF385C" : "1px solid #e5e7eb" }}>{s}</button>; })}</div>
          </div>
          <div><label className={lc}>Languages</label>
            <div className="flex flex-wrap gap-2 mt-1">{Array.from(new Set([...TOUR_GUIDE_LANGUAGES, ...(form.languages || [])])).map(l => { const on = (form.languages||[]).includes(l); return <button key={l} type="button" onClick={() => toggleLang(l)} className="px-3 py-1.5 rounded-full text-xs font-medium transition-all" style={{ background: on ? "#003580" : "#f3f4f6", color: on ? "white" : "#374151", border: on ? "1px solid #003580" : "1px solid #e5e7eb" }}>{l}</button>; })}</div>
          </div>
          <div><label className={lc}>Bio</label><textarea rows={3} className={ic} placeholder="Brief bio..." value={form.bio || ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} style={{ resize: "vertical" }} /></div>
        </div>
        <div className="flex gap-3 justify-end pt-5 mt-5 border-t border-gray-100 dark:border-slate-700">
          <button onClick={() => setOpen(false)} className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/40">Cancel</button>
          <button onClick={save} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90" style={{ background: "linear-gradient(135deg, #FF385C, #E31C5F)" }}>{edit ? "Save Changes" : "Add Guide"}</button>
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!delId} onClose={() => setDelId(null)} onConfirm={del} title="Remove Guide?" message="This guide will be permanently removed from the platform." />
    </div>
  );
}
