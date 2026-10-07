import { useEffect, useState } from "react";
import { Plus, Search, Edit2, Trash2, MapPin, Star, Globe, Filter } from "lucide-react";
import { Modal, ConfirmDialog, StatCard, PageHeader, ic, lc } from "../../components/Modal";
import { destinationsApi, type Destination } from "../../lib/api";

const continents = ["Africa", "Asia", "Europe", "North America", "South America", "Oceania"];
const allCategories = ["Cultural", "Romance", "Art", "Nature", "Spiritual", "Beach", "City", "Food", "Technology", "Architecture", "History", "Adventure", "Luxury", "Wildlife", "Diving"];
const statusList = ["Featured", "Active", "Hidden"];
const statusStyle: Record<string, { bg: string; color: string }> = {
  Featured: { bg: "#fff0f3", color: "#FF385C" },
  Active: { bg: "#f0fdf4", color: "#16a34a" },
  Hidden: { bg: "#f3f4f6", color: "#6b7280" },
};

export function DestinationManagement() {
  const [items, setItems] = useState<Destination[]>([]);
  const [search, setSearch] = useState("");
  const [fContinent, setFContinent] = useState("All");
  const [fStatus, setFStatus] = useState("All");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Destination | null>(null);
  const [form, setForm] = useState<Partial<Destination & { catStr: string }>>({});
  const [delId, setDelId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    destinationsApi.list().then(setItems).catch((error) => setError(error instanceof Error ? error.message : "Failed to load destinations"));
  }, []);

  const filtered = items.filter((d) =>
    (d.name.toLowerCase().includes(search.toLowerCase()) || d.country.toLowerCase().includes(search.toLowerCase())) &&
    (fContinent === "All" || d.continent === fContinent) && (fStatus === "All" || d.status === fStatus)
  );

  const openAdd = () => { setEdit(null); setForm({ status: "Active" }); setOpen(true); };
  const openEdit = (d: Destination) => { setEdit(d); setForm({ ...d, catStr: d.categories.join(", ") }); setOpen(true); };
  const save = async () => {
    if (!form.name) return;
    setError("");
    const categories = (form.catStr || "").split(",").map(s => s.trim()).filter(Boolean);
    const payload = { name: form.name!, country: form.country || "", continent: form.continent || "Asia", categories, description: form.description || "", image: form.image || "", status: form.status || "Active", bestSeason: form.bestSeason || "", highlights: form.highlights || "" };
    try {
      if (edit) {
        const saved = await destinationsApi.update(edit.id, payload);
        setItems(items.map(i => i.id === edit.id ? saved : i));
      } else {
        const saved = await destinationsApi.create(payload);
        setItems([saved, ...items]);
      }
      setOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to save destination");
    }
  };
  const del = async () => {
    if (!delId) return;
    setError("");
    try {
      await destinationsApi.remove(delId);
      setItems(items.filter(i => i.id !== delId));
      setDelId(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to delete destination");
    }
  };

  const featured = items.filter(d => d.status === "Featured").length;
  const countries = new Set(items.map(d => d.country)).size;

  return (
    <div>
      <PageHeader icon={MapPin} title="Destinations" subtitle="Showcase the places travelers can explore with Voyara" actionLabel="Add Destination" onAction={openAdd} />
      {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard icon={MapPin} label="Total Destinations" value={items.length} bg="#fff0f3" color="#FF385C" />
        <StatCard icon={Star} label="Featured" value={featured} bg="#fefce8" color="#ca8a04" />
        <StatCard icon={Globe} label="Regions Covered" value={countries} bg="#f0fdf4" color="#16a34a" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
          <input className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 placeholder:text-gray-400 dark:placeholder:text-slate-500 text-sm focus:outline-none" placeholder="Search destinations..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Filter className="w-4 h-4 text-gray-400 dark:text-slate-500 self-center shrink-0" />
          <select className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-700 dark:text-slate-300" value={fContinent} onChange={(e) => setFContinent(e.target.value)}>
            <option>All</option>{continents.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-700 dark:text-slate-300" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option>All</option>{statusList.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((d) => {
          const ss = statusStyle[d.status];
          return (
            <div key={d.id} className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden hover:shadow-lg transition-all border border-gray-200 dark:border-slate-700">
              <div className="relative" style={{ height: 160 }}>
                <img src={d.image} alt={d.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=500&q=80"; }} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 50%)" }} />
                <div className="absolute bottom-3 left-3">
                  <h3 className="text-white font-bold" style={{ fontSize: "1.1rem" }}>{d.name}</h3>
                  <div className="flex items-center gap-1 text-white/80 text-xs"><MapPin className="w-3 h-3" />{d.country} · {d.continent}</div>
                </div>
                <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: ss.bg, color: ss.color }}>{d.status}</span>
              </div>
              <div className="p-4">
                <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed mb-3" style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{d.description}</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {d.categories.slice(0, 3).map(c => <span key={c} className="px-2 py-0.5 rounded-full text-xs" style={{ background: "#fff0f3", color: "#FF385C" }}>{c}</span>)}
                  {d.categories.length > 3 && <span className="text-xs text-gray-400 dark:text-slate-500">+{d.categories.length-3}</span>}
                </div>
                {d.bestSeason && <p className="text-xs text-gray-400 dark:text-slate-500 mb-3"><span className="font-medium text-gray-600 dark:text-slate-300">Best season:</span> {d.bestSeason}</p>}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-700">
                  <p className="text-xs text-gray-400 dark:text-slate-500 truncate mr-2">{d.highlights}</p>
                  <div className="flex gap-1.5 shrink-0">
                    <button onClick={() => openEdit(d)} className="p-1.5 rounded-lg hover:bg-blue-50" style={{ color: "#3b82f6" }}><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => setDelId(d.id)} className="p-1.5 rounded-lg hover:bg-red-50" style={{ color: "#ef4444" }}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {!filtered.length && <div className="col-span-3 py-16 text-center text-gray-400 dark:text-slate-500"><MapPin className="w-10 h-10 mx-auto mb-2 opacity-25" /><p>No destinations found</p></div>}
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={edit ? "Edit Destination" : "Add New Destination"} subtitle="Destination details and metadata" size="xl">
        <div className="grid grid-cols-2 gap-4">
          <div><label className={lc}>Destination Name</label><input className={ic} placeholder="Sigiriya" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className={lc}>Country</label><input className={ic} placeholder="Sri Lanka" value={form.country || ""} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
          <div><label className={lc}>Continent</label>
            <select className={ic} value={form.continent || ""} onChange={(e) => setForm({ ...form, continent: e.target.value })}>
              <option value="">Select</option>{continents.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div><label className={lc}>Status</label>
            <select className={ic} value={form.status || ""} onChange={(e) => setForm({ ...form, status: e.target.value as Destination["status"] })}>
              {statusList.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="col-span-2"><label className={lc}>Description</label><textarea rows={2} className={ic} placeholder="Brief destination description..." value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ resize: "none" }} /></div>
          <div className="col-span-2"><label className={lc}>Categories (comma-separated)</label><input className={ic} placeholder="Cultural, Romance, Art" value={(form as any).catStr || ""} onChange={(e) => setForm({ ...form, catStr: e.target.value })} /></div>
          <div><label className={lc}>Best Season to Visit</label><input className={ic} placeholder="Apr – Jun, Sep – Oct" value={form.bestSeason || ""} onChange={(e) => setForm({ ...form, bestSeason: e.target.value })} /></div>
          <div className="col-span-2"><label className={lc}>Key Highlights</label><input className={ic} placeholder="Eiffel Tower, Louvre, Versailles, Seine River" value={form.highlights || ""} onChange={(e) => setForm({ ...form, highlights: e.target.value })} /></div>
          <div className="col-span-2"><label className={lc}>Image URL</label><input className={ic} placeholder="https://..." value={form.image || ""} onChange={(e) => setForm({ ...form, image: e.target.value })} /></div>
        </div>
        <div className="flex gap-3 justify-end pt-5 mt-5 border-t border-gray-100 dark:border-slate-700">
          <button onClick={() => setOpen(false)} className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/40">Cancel</button>
          <button onClick={save} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90" style={{ background: "linear-gradient(135deg, #FF385C, #E31C5F)" }}>{edit ? "Save Changes" : "Add Destination"}</button>
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!delId} onClose={() => setDelId(null)} onConfirm={del} title="Remove Destination?" message="This destination will be permanently removed from the platform." />
    </div>
  );
}
