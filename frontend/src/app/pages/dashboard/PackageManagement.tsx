import { useEffect, useState } from "react";
import { Plus, Search, Edit2, Trash2, Package, MapPin, Filter, Clock, Users, TrendingUp, Star } from "lucide-react";
import { Modal, ConfirmDialog, StatCard, PageHeader, ic, lc } from "../../components/Modal";
import { adminPackagesApi, type TourPackage } from "../../lib/api";

const categories = ["City Tour", "Cultural", "Beach", "Adventure", "Food & Drink", "Wildlife", "Nature", "Photography"];
const difficulties = ["Easy", "Moderate", "Challenging"];
const statuses = ["Active", "Draft", "Archived"];
const diffColor: Record<string, { bg: string; color: string }> = {
  Easy: { bg: "#f0fdf4", color: "#16a34a" },
  Moderate: { bg: "#fffbeb", color: "#d97706" },
  Challenging: { bg: "#fef2f2", color: "#dc2626" },
};
const statusColor: Record<string, { bg: string; color: string }> = {
  Active: { bg: "#f0fdf4", color: "#16a34a" },
  Draft: { bg: "#fffbeb", color: "#d97706" },
  Archived: { bg: "#f3f4f6", color: "#6b7280" },
};

export function PackageManagement() {
  const [items, setItems] = useState<TourPackage[]>([]);
  const [search, setSearch] = useState("");
  const [fCat, setFCat] = useState("All");
  const [fStatus, setFStatus] = useState("All");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<TourPackage | null>(null);
  const [form, setForm] = useState<Partial<TourPackage & { destinationsStr: string }>>({});
  const [delId, setDelId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminPackagesApi.list().then(setItems).catch((error) => setError(error instanceof Error ? error.message : "Failed to load packages"));
  }, []);

  const filtered = items.filter((p) =>
    (p.name.toLowerCase().includes(search.toLowerCase()) || p.destinations.join(" ").toLowerCase().includes(search.toLowerCase())) &&
    (fCat === "All" || p.category === fCat) && (fStatus === "All" || p.status === fStatus)
  );

  const openAdd = () => { setEdit(null); setForm({ status: "Draft", difficulty: "Easy" }); setOpen(true); };
  const openEdit = (p: TourPackage) => { setEdit(p); setForm({ ...p, destinationsStr: p.destinations.join(", ") }); setOpen(true); };
  const save = async () => {
    if (!form.name) return;
    setError("");
    const destinations = (form.destinationsStr || "").split(",").map(s => s.trim()).filter(Boolean);
    const payload = { bookings: form.bookings ?? 0, image: form.image || "", included: form.included || "", description: form.description || "", name: form.name!, category: form.category || "City Tour", destinations, duration: form.duration || 1, price: form.price || 0, maxGroup: form.maxGroup || 10, difficulty: form.difficulty || "Easy", status: form.status || "Draft" };
    try {
      if (edit) {
        const saved = await adminPackagesApi.update(edit.id, payload);
        setItems(items.map(i => i.id === edit.id ? saved : i));
      } else {
        const saved = await adminPackagesApi.create(payload);
        setItems([saved, ...items]);
      }
      setOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to save package");
    }
  };
  const del = async () => {
    if (!delId) return;
    setError("");
    try {
      await adminPackagesApi.remove(delId);
      setItems(items.filter(i => i.id !== delId));
      setDelId(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to delete package");
    }
  };

  const active = items.filter(p => p.status === "Active").length;
  const totalBookings = items.reduce((s, p) => s + p.bookings, 0);

  return (
    <div>
      <PageHeader icon={Package} title="Tour Packages" subtitle="Curate and price your multi-day travel experiences" actionLabel="Add Package" onAction={openAdd} />
      {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Package} label="Total Packages" value={items.length} bg="#fff0f3" color="#FF385C" />
        <StatCard icon={Star} label="Active" value={active} bg="#f0fdf4" color="#16a34a" />
        <StatCard icon={TrendingUp} label="Total Bookings" value={totalBookings} bg="#f0f9ff" color="#0284c7" />
        <StatCard icon={Clock} label="Avg Duration" value={`${items.length ? Math.round(items.reduce((s,p) => s+p.duration, 0)/items.length) : 0} days`} bg="#fefce8" color="#ca8a04" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
          <input className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 placeholder:text-gray-400 dark:placeholder:text-slate-500 text-sm focus:outline-none" placeholder="Search packages..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Filter className="w-4 h-4 text-gray-400 dark:text-slate-500 self-center shrink-0" />
          <select className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-700 dark:text-slate-300" value={fCat} onChange={(e) => setFCat(e.target.value)}>
            <option>All</option>{categories.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-700 dark:text-slate-300" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option>All</option>{statuses.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((p) => {
          const ds = diffColor[p.difficulty];
          const ss = statusColor[p.status];
          return (
            <div key={p.id} className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden hover:shadow-lg transition-all border border-gray-200 dark:border-slate-700">
              <div className="relative" style={{ height: 160 }}>
                <img src={p.image} alt={p.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=500&q=80"; }} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 55%)" }} />
                <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}>{p.category}</span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: ds.bg, color: ds.color }}>{p.difficulty}</span>
                </div>
                <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: ss.bg, color: ss.color }}>{p.status}</span>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-900 dark:text-white mb-1" style={{ fontSize: "0.95rem" }}>{p.name}</h3>
                <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500 mb-2">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{p.destinations.join(" · ")}</span>
                </div>
                <div className="flex gap-3 mb-3 text-xs text-gray-500 dark:text-slate-400">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{p.duration} days</span>
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />Max {p.maxGroup}</span>
                  <span className="flex items-center gap-1"><TrendingUp className="w-3.5 h-3.5" />{p.bookings} booked</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-slate-400 line-clamp-2 mb-3">{p.description}</p>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-700">
                  <div>
                    <p className="text-xs text-gray-400 dark:text-slate-500">From</p>
                    <p className="dark:text-white" style={{ fontWeight: 800, fontSize: "1.1rem" }}>රු{p.price.toLocaleString()}<span className="text-xs font-normal text-gray-400 dark:text-slate-500"> /person</span></p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-blue-50" style={{ color: "#3b82f6" }}><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => setDelId(p.id)} className="p-1.5 rounded-lg hover:bg-red-50" style={{ color: "#ef4444" }}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {!filtered.length && <div className="col-span-3 py-16 text-center text-gray-400 dark:text-slate-500"><Package className="w-10 h-10 mx-auto mb-2 opacity-25" /><p>No packages found</p></div>}
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={edit ? "Edit Package" : "Add New Package"} subtitle="Define the tour package details" size="xl">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className={lc}>Package Name</label><input className={ic} placeholder="Sigiriya Cultural Highlights" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className={lc}>Category</label>
            <select className={ic} value={form.category || ""} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="">Select</option>{categories.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label className={lc}>Difficulty</label>
            <select className={ic} value={form.difficulty || ""} onChange={(e) => setForm({ ...form, difficulty: e.target.value as TourPackage["difficulty"] })}>
              {difficulties.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <div><label className={lc}>Duration (days)</label><input type="number" min="1" className={ic} placeholder="5" value={form.duration || ""} onChange={(e) => setForm({ ...form, duration: +e.target.value })} /></div>
          <div><label className={lc}>Price per Person (රු)</label><input type="number" className={ic} placeholder="499" value={form.price || ""} onChange={(e) => setForm({ ...form, price: +e.target.value })} /></div>
          <div><label className={lc}>Max Group Size</label><input type="number" className={ic} placeholder="12" value={form.maxGroup || ""} onChange={(e) => setForm({ ...form, maxGroup: +e.target.value })} /></div>
          <div><label className={lc}>Status</label>
            <select className={ic} value={form.status || ""} onChange={(e) => setForm({ ...form, status: e.target.value as TourPackage["status"] })}>
              {statuses.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="col-span-2"><label className={lc}>Destinations (comma-separated)</label><input className={ic} placeholder="Sigiriya, Dambulla, Kandy" value={(form as any).destinationsStr || ""} onChange={(e) => setForm({ ...form, destinationsStr: e.target.value })} /></div>
          <div className="col-span-2"><label className={lc}>Description</label><textarea rows={2} className={ic} placeholder="Brief tour description..." value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ resize: "none" }} /></div>
          <div className="col-span-2"><label className={lc}>What's Included</label><textarea rows={2} className={ic} placeholder="Hotel, Guide, Meals, Transport..." value={form.included || ""} onChange={(e) => setForm({ ...form, included: e.target.value })} style={{ resize: "none" }} /></div>
          <div className="col-span-2"><label className={lc}>Image URL</label><input className={ic} placeholder="https://..." value={form.image || ""} onChange={(e) => setForm({ ...form, image: e.target.value })} /></div>
        </div>
        <div className="flex gap-3 justify-end pt-5 mt-5 border-t border-gray-100 dark:border-slate-700">
          <button onClick={() => setOpen(false)} className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/40">Cancel</button>
          <button onClick={save} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90" style={{ background: "linear-gradient(135deg, #FF385C, #E31C5F)" }}>{edit ? "Save Changes" : "Add Package"}</button>
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!delId} onClose={() => setDelId(null)} onConfirm={del} title="Delete Package?" message="This tour package will be permanently removed." />
    </div>
  );
}
