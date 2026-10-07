import { useEffect, useState } from "react";
import { Plus, Search, Edit2, Trash2, BedDouble, Star, MapPin, Filter, Home } from "lucide-react";
import { Modal, ConfirmDialog, StatCard, PageHeader, ic, lc } from "../../components/Modal";
import { accommodationsApi, partnerAccommodationsApi, destinationsApi, reassignAccommodationOwner, stakeholdersApi, type Accommodation, type Destination, type Stakeholder } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

const allAmenities = ["WiFi", "Pool", "Gym", "Spa", "Restaurant", "Bar", "Parking", "Pet Friendly", "Beach Access", "Room Service", "Lounge", "Concierge", "Nature Views"];
const types = ["Hotel", "Villa", "Resort", "Hostel", "Apartment"];
const statuses = ["Active", "Inactive", "Maintenance", "Pending Approval", "Rejected"];
const typeColor: Record<string, string> = { Hotel: "#3b82f6", Villa: "#8b5cf6", Resort: "#f59e0b", Hostel: "#14b8a6", Apartment: "#64748b" };
const statusStyle: Record<string, { bg: string; color: string }> = {
  Active: { bg: "#f0fdf4", color: "#16a34a" },
  Inactive: { bg: "#f3f4f6", color: "#6b7280" },
  Maintenance: { bg: "#fffbeb", color: "#d97706" },
  "Pending Approval": { bg: "#eff6ff", color: "#2563eb" },
  Rejected: { bg: "#fef2f2", color: "#dc2626" },
};

export function AccommodationManagement() {
  const { user } = useAuth();
  const isHotelPartner = user?.roles.includes("HOTEL_PARTNER") ?? false;
  const inventoryApi = isHotelPartner ? partnerAccommodationsApi : accommodationsApi;
  const [items, setItems] = useState<Accommodation[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [hotelPartners, setHotelPartners] = useState<Stakeholder[]>([]);
  const [ownerUserId, setOwnerUserId] = useState("");
  const [search, setSearch] = useState("");
  const [fType, setFType] = useState("All");
  const [fStatus, setFStatus] = useState("All");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Accommodation | null>(null);
  const [form, setForm] = useState<Partial<Accommodation>>({});
  const [delId, setDelId] = useState<number | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    inventoryApi.list().then(setItems).catch((error) => setError(error instanceof Error ? error.message : "Failed to load accommodations"));
    destinationsApi.list().then(setDestinations).catch((error) => console.error("Failed to load destinations", error));
    if (!isHotelPartner) stakeholdersApi.list().then((values) => setHotelPartners(values.filter((value) => value.accessProfile === "HOTEL_PARTNER"))).catch(() => setHotelPartners([]));
  }, []);

  const filtered = items.filter((i) =>
    (i.name.toLowerCase().includes(search.toLowerCase()) || i.location.toLowerCase().includes(search.toLowerCase())) &&
    (fType === "All" || i.type === fType) && (fStatus === "All" || i.status === fStatus)
  );

  const openAdd = () => { setEdit(null); setOwnerUserId(""); setForm({ status: "Active", occupancy: 0 }); setOpen(true); };
  const openEdit = (i: Accommodation) => { setEdit(i); setOwnerUserId(i.ownerUserId ? String(i.ownerUserId) : ""); setForm({ ...i }); setOpen(true); };
  const toggle = (a: string) => {
    const arr = form.amenities || [];
    setForm({ ...form, amenities: arr.includes(a) ? arr.filter((x) => x !== a) : [...arr, a] });
  };
  const save = async () => {
    if (!form.name) return;
    const payload = { reviews: form.reviews ?? 0, amenities: form.amenities || [], name: form.name!, type: form.type || "Hotel", destinationId: form.destinationId ?? null, location: form.location || "", country: form.country || "", price: form.price || 0, rooms: form.rooms || 0, rating: form.rating || 0, status: form.status || "Active", image: form.image || "", occupancy: form.occupancy || 0 };
    setError("");
    try {
      if (edit) {
        let saved = await inventoryApi.update(edit.id, payload);
        const nextOwnerUserId = ownerUserId ? Number(ownerUserId) : null;
        if (!isHotelPartner && nextOwnerUserId !== (edit.ownerUserId ?? null)) saved = await reassignAccommodationOwner(edit.id, nextOwnerUserId);
        setItems(items.map(i => i.id === edit.id ? saved : i));
      } else {
        let saved = await inventoryApi.create(payload);
        if (!isHotelPartner && ownerUserId) saved = await reassignAccommodationOwner(saved.id, Number(ownerUserId));
        setItems([saved, ...items]);
      }
      setOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to save accommodation");
    }
  };
  const del = async () => {
    if (!delId) return;
    setError("");
    try {
      await inventoryApi.remove(delId);
      setItems(items.filter(i => i.id !== delId));
      setDelId(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to delete accommodation");
    }
  };

  const active = items.filter((i) => i.status === "Active").length;
  const availableRooms = items.reduce((sum, item) => sum + Number(item.availableRooms ?? item.rooms ?? 0), 0);

  return (
    <div>
      <PageHeader icon={BedDouble} title={isHotelPartner ? "My Properties" : "Accommodations"} subtitle={isHotelPartner ? "Create and manage your hotel listings" : "Manage hotels, villas & resorts across your network"} actionLabel="Add Property" onAction={openAdd} />
      {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={BedDouble} label="Total Properties" value={items.length} bg="#fff0f3" color="#FF385C" />
        <StatCard icon={Home} label="Active" value={active} bg="#f0fdf4" color="#16a34a" />
        <StatCard icon={Star} label="Avg Price / Night" value={`රු${items.length ? Math.round(items.reduce((s, i) => s + i.price, 0) / items.length) : 0}`} bg="#f0f9ff" color="#0284c7" />
        <StatCard icon={BedDouble} label="Available Rooms" value={availableRooms} bg="#fefce8" color="#ca8a04" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
          <input className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 placeholder:text-gray-400 dark:placeholder:text-slate-500 text-sm focus:outline-none" placeholder="Search properties..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Filter className="w-4 h-4 text-gray-400 dark:text-slate-500 self-center shrink-0" />
          <select className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-700 dark:text-slate-300" value={fType} onChange={(e) => setFType(e.target.value)}>
            <option>All</option>{types.map((t) => <option key={t}>{t}</option>)}
          </select>
          <select className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-700 dark:text-slate-300" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option>All</option>{statuses.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((item) => {
          const ss = statusStyle[item.status];
          const available = Number(item.availableRooms ?? item.rooms ?? 0);
          return (
            <div key={item.id} className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden hover:shadow-lg transition-all border border-gray-200 dark:border-slate-700">
              <div className="relative" style={{ height: 155 }}>
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=500&q=80"; }} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 55%)" }} />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ background: typeColor[item.type] }}>{item.type}</span>
                <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: ss.bg, color: ss.color }}>{item.status}</span>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-900 dark:text-white truncate mb-0.5" style={{ fontSize: "0.95rem" }}>{item.name}</h3>
                <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500 mb-3">
                  <MapPin className="w-3 h-3" />{item.location}, {item.country}
                </div>
                {!isHotelPartner && <p className="mb-3 text-xs text-gray-500 dark:text-slate-400">Owner: {item.ownerName ? `${item.ownerName} · ${item.ownerEmail}` : "Voyara admin"}</p>}
                <div className="flex items-center justify-between mb-3">
                  <span><span style={{ fontWeight: 800, fontSize: "1.1rem" }}>රු{item.price}</span><span className="text-xs text-gray-400 dark:text-slate-500"> /night</span></span>
                  <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" style={{ fill: "#FF385C", color: "#FF385C" }} /><span className="text-sm font-semibold">{item.rating}</span><span className="text-xs text-gray-400 dark:text-slate-500">({item.reviews})</span></span>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {(item.amenities || []).slice(0, 3).map((a) => <span key={a} className="px-2 py-0.5 rounded-full text-xs" style={{ background: "#f3f4f6", color: "#6b7280" }}>{a}</span>)}
                  {(item.amenities || []).length > 3 && <span className="text-xs text-gray-400 dark:text-slate-500">+{(item.amenities || []).length - 3}</span>}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-700">
                  <span className="text-xs text-gray-400 dark:text-slate-500">{available} available / {item.rooms} rooms</span>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-blue-50" style={{ color: "#3b82f6" }}><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => setDelId(item.id)} className="p-1.5 rounded-lg hover:bg-red-50" style={{ color: "#ef4444" }}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {!filtered.length && <div className="col-span-3 py-16 text-center text-gray-400 dark:text-slate-500"><BedDouble className="w-10 h-10 mx-auto mb-2 opacity-25" /><p>No properties found</p></div>}
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={edit ? "Edit Property" : "Add New Property"} subtitle="Fill in property details below">
        <div className="space-y-4">
          <div><label className={lc}>Property Name</label><input className={ic} placeholder="e.g. Le Marais Boutique Hotel" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lc}>Type</label>
              <select className={ic} value={form.type || ""} onChange={(e) => setForm({ ...form, type: e.target.value as Accommodation["type"] })}>
                <option value="">Select type</option>{types.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            {!isHotelPartner && <div><label className={lc}>Status</label>
              <select className={ic} value={form.status || ""} onChange={(e) => setForm({ ...form, status: e.target.value as Accommodation["status"] })}>
                <option value="">Select</option>{statuses.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lc}>City / Location</label><input className={ic} placeholder="Kandy" value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div><label className={lc}>Country</label><input className={ic} placeholder="Sri Lanka" value={form.country || ""} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
          </div>
          <div><label className={lc}>Destination</label>
            <select className={ic} value={form.destinationId ?? ""} onChange={(e) => setForm({ ...form, destinationId: e.target.value ? Number(e.target.value) : null })}>
              <option value="">Select destination</option>
              {destinations.map((destination) => <option key={destination.id} value={destination.id}>{destination.name}, {destination.country}</option>)}
            </select>
          </div>
          {!isHotelPartner && <div><label className={lc}>Hotel Partner Owner</label><select className={ic} value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)}><option value="">Voyara admin</option>{hotelPartners.map((partner) => <option key={partner.id} value={partner.id}>{partner.fullName} · {partner.email}</option>)}</select></div>}
          <div className="grid grid-cols-3 gap-3">
            <div><label className={lc}>Price/Night (රු)</label><input type="number" className={ic} placeholder="180" value={form.price || ""} onChange={(e) => setForm({ ...form, price: +e.target.value })} /></div>
            <div><label className={lc}>Rooms</label><input type="number" className={ic} placeholder="24" value={form.rooms || ""} onChange={(e) => setForm({ ...form, rooms: +e.target.value })} /></div>
            {!isHotelPartner && <div><label className={lc}>Rating (0–5)</label><input type="number" step="0.1" max="5" className={ic} placeholder="4.8" value={form.rating || ""} onChange={(e) => setForm({ ...form, rating: +e.target.value })} /></div>}
          </div>
          <div><label className={lc}>Image URL</label><input className={ic} placeholder="https://..." value={form.image || ""} onChange={(e) => setForm({ ...form, image: e.target.value })} /></div>
          <div>
            <label className={lc}>Amenities</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {allAmenities.map((a) => { const on = (form.amenities || []).includes(a); return <button key={a} type="button" onClick={() => toggle(a)} className="px-3 py-1.5 rounded-full text-xs font-medium transition-all" style={{ background: on ? "#FF385C" : "#f3f4f6", color: on ? "white" : "#374151", border: on ? "1px solid #FF385C" : "1px solid #e5e7eb" }}>{a}</button>; })}
            </div>
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-5 mt-5 border-t border-gray-100 dark:border-slate-700">
          <button onClick={() => setOpen(false)} className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/40">Cancel</button>
          <button onClick={save} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90" style={{ background: "linear-gradient(135deg, #FF385C, #E31C5F)" }}>{edit ? "Save Changes" : "Add Property"}</button>
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!delId} onClose={() => setDelId(null)} onConfirm={del} title="Delete Property?" message="This property will be permanently removed if it has no booking history." />
    </div>
  );
}
