import { useEffect, useState } from "react";
import { Plus, Search, Edit2, Trash2, Car, Users, MapPin, Filter, Fuel, Settings, Wrench, Package } from "lucide-react";
import { Modal, ConfirmDialog, StatCard, PageHeader, ic, lc } from "../../components/Modal";
import { vehiclesApi, partnerVehiclesApi, reassignVehicleOwner, stakeholdersApi, type Stakeholder, type Vehicle } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

const vehicleTypes = ["Car", "SUV", "Van", "Minibus", "Motorbike", "Luxury"];
const transmissions = ["Automatic", "Manual"];
const fuels = ["Petrol", "Diesel", "Electric", "Hybrid"];
const statusList = ["Available", "Rented", "Maintenance", "Pending Approval", "Rejected", "Inactive"];
const allFeatures = ["A/C", "GPS", "Bluetooth", "USB", "4WD", "WiFi", "Roof Rack", "Reclining Seats", "Heated Seats", "Entertainment", "Panoramic Roof", "Large Boot", "Helmet Included", "Autopilot", "Storage Box", "Phone Holder"];

const statusStyle: Record<string, { bg: string; color: string; dot: string }> = {
  Available: { bg: "#f0fdf4", color: "#16a34a", dot: "#16a34a" },
  Rented: { bg: "#f0f9ff", color: "#0284c7", dot: "#0284c7" },
  Maintenance: { bg: "#fffbeb", color: "#d97706", dot: "#f59e0b" },
  "Pending Approval": { bg: "#eff6ff", color: "#2563eb", dot: "#2563eb" },
  Rejected: { bg: "#fef2f2", color: "#dc2626", dot: "#dc2626" },
  Inactive: { bg: "#f3f4f6", color: "#6b7280", dot: "#6b7280" },
};
const typeColor: Record<string, string> = { Car: "#3b82f6", SUV: "#16a34a", Van: "#7c3aed", Minibus: "#ea580c", Motorbike: "#FF385C", Luxury: "#ca8a04" };

export function VehicleRentalManagement() {
  const { user } = useAuth();
  const isTransportProvider = user?.roles.includes("TRANSPORT_PROVIDER") ?? false;
  const inventoryApi = isTransportProvider ? partnerVehiclesApi : vehiclesApi;
  const [items, setItems] = useState<Vehicle[]>([]);
  const [search, setSearch] = useState("");
  const [fType, setFType] = useState("All");
  const [fStatus, setFStatus] = useState("All");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Vehicle | null>(null);
  const [form, setForm] = useState<Partial<Vehicle>>({});
  const [delId, setDelId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [providers, setProviders] = useState<Stakeholder[]>([]);
  const [ownerUserId, setOwnerUserId] = useState("");

  useEffect(() => {
    inventoryApi.list().then(setItems).catch((error) => setError(error instanceof Error ? error.message : "Failed to load vehicles"));
    if (!isTransportProvider) stakeholdersApi.list().then((values) => setProviders(values.filter((value) => value.accessProfile === "TRANSPORT_PROVIDER"))).catch(() => setProviders([]));
  }, []);

  const filtered = items.filter((v) =>
    (v.name.toLowerCase().includes(search.toLowerCase()) || v.brand.toLowerCase().includes(search.toLowerCase()) || v.location.toLowerCase().includes(search.toLowerCase())) &&
    (fType === "All" || v.type === fType) && (fStatus === "All" || v.status === fStatus)
  );

  const openAdd = () => { setEdit(null); setOwnerUserId(""); setForm({ type: "Car", transmission: "Automatic", fuel: "Petrol", status: "Available", features: [] }); setOpen(true); };
  const openEdit = (v: Vehicle) => { setEdit(v); setOwnerUserId(v.ownerUserId ? String(v.ownerUserId) : ""); setForm({ ...v }); setOpen(true); };
  const toggleFeature = (f: string) => { const a = form.features || []; setForm({ ...form, features: a.includes(f) ? a.filter(x => x !== f) : [...a, f] }); };
  const save = async () => {
    if (!form.name) return;
    setError("");
    const payload = { mileage: form.mileage ?? 0, features: form.features || [], name: form.name!, brand: form.brand || "", model: form.model || "", year: form.year || new Date().getFullYear(), type: form.type || "Car", capacity: form.capacity || 4, pricePerDay: form.pricePerDay || 0, status: form.status || "Available", transmission: form.transmission || "Automatic", fuel: form.fuel || "Petrol", location: form.location || "", image: form.image || "", plate: form.plate || "" };
    try {
      if (edit) {
        let saved = await inventoryApi.update(edit.id, payload);
        if (!isTransportProvider && ownerUserId && Number(ownerUserId) !== edit.ownerUserId) saved = await reassignVehicleOwner(edit.id, Number(ownerUserId));
        setItems(items.map(i => i.id === edit.id ? saved : i));
      } else {
        let saved = await inventoryApi.create(payload);
        if (!isTransportProvider && ownerUserId) saved = await reassignVehicleOwner(saved.id, Number(ownerUserId));
        setItems([saved, ...items]);
      }
      setOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to save vehicle");
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
      setError(error instanceof Error ? error.message : "Failed to delete vehicle");
    }
  };

  const available = items.filter(v => v.status === "Available").length;
  const rented = items.filter(v => v.status === "Rented").length;
  const revenue = items.filter(v => v.status === "Rented").reduce((s, v) => s + v.pricePerDay, 0);

  return (
    <div>
      <PageHeader icon={Car} title={isTransportProvider ? "My Vehicles" : "Vehicle Rentals"} subtitle={isTransportProvider ? "Create and manage your vehicle listings" : "Manage your fleet, availability and daily rates"} actionLabel="Add Vehicle" onAction={openAdd} />
      {error && <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Car} label="Total Fleet" value={items.length} bg="#fff0f3" color="#FF385C" />
        <StatCard icon={Settings} label="Available" value={available} bg="#f0fdf4" color="#16a34a" />
        <StatCard icon={Users} label="Currently Rented" value={rented} bg="#f0f9ff" color="#0284c7" />
        <StatCard icon={Wrench} label="Daily Revenue" value={`රු${revenue}`} bg="#fefce8" color="#ca8a04" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
          <input className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 placeholder:text-gray-400 dark:placeholder:text-slate-500 text-sm focus:outline-none" placeholder="Search vehicles, brand or location..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Filter className="w-4 h-4 text-gray-400 dark:text-slate-500 self-center shrink-0" />
          <select className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-700 dark:text-slate-300" value={fType} onChange={(e) => setFType(e.target.value)}>
            <option>All</option>{vehicleTypes.map(t => <option key={t}>{t}</option>)}
          </select>
          <select className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-700 dark:text-slate-300" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
            <option>All</option>{statusList.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {filtered.map((v) => {
          const ss = statusStyle[v.status];
          return (
            <div key={v.id} className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden hover:shadow-lg transition-all border border-gray-200 dark:border-slate-700">
              <div className="relative" style={{ height: 150 }}>
                <img src={v.image} alt={v.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1544945582-052b29cd29e4?w=500&q=80"; }} />
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 55%)" }} />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold text-white" style={{ background: typeColor[v.type] || "#6b7280" }}>{v.type}</span>
                <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ background: ss.bg }}>
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: ss.dot }} />
                  <span className="text-xs font-semibold" style={{ color: ss.color }}>{v.status}</span>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-0.5">
                  <h3 className="font-bold text-gray-900 dark:text-white" style={{ fontSize: "0.95rem" }}>{v.brand} {v.model}</h3>
                  <span className="text-xs text-gray-400 dark:text-slate-500 shrink-0 ml-2">{v.year}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500 mb-3"><MapPin className="w-3 h-3" />{v.location}</div>
                {!isTransportProvider && <p className="mb-3 text-xs text-gray-500 dark:text-slate-400">Owner: {v.ownerName ? `${v.ownerName} · ${v.ownerEmail}` : "Voyara admin"}</p>}

                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { icon: Users, label: `${v.capacity} seats` },
                    { icon: Package, label: `${vehicleLuggageCapacity(v)} luggage` },
                    { icon: Settings, label: v.transmission },
                    { icon: Fuel, label: v.fuel },
                  ].map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400">
                      <Icon className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />{label}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  {v.features.slice(0, 4).map(f => <span key={f} className="px-2 py-0.5 rounded-full text-xs" style={{ background: "#f3f4f6", color: "#6b7280" }}>{f}</span>)}
                  {v.features.length > 4 && <span className="text-xs text-gray-400 dark:text-slate-500">+{v.features.length - 4}</span>}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-slate-700">
                  <div>
                    <p className="text-xs text-gray-400 dark:text-slate-500">Plate: <span className="font-medium text-gray-600 dark:text-slate-300">{v.plate}</span></p>
                    <p className="dark:text-white" style={{ fontWeight: 800, fontSize: "1.1rem" }}>රු{v.pricePerDay}<span className="text-xs font-normal text-gray-400 dark:text-slate-500">/day</span></p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(v)} className="p-1.5 rounded-lg hover:bg-blue-50" style={{ color: "#3b82f6" }}><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => setDelId(v.id)} className="p-1.5 rounded-lg hover:bg-red-50" style={{ color: "#ef4444" }}><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {!filtered.length && <div className="col-span-3 py-16 text-center text-gray-400 dark:text-slate-500"><Car className="w-10 h-10 mx-auto mb-2 opacity-25" /><p>No vehicles found</p></div>}
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={edit ? "Edit Vehicle" : "Add New Vehicle"} subtitle="Vehicle details and specifications" size="xl">
        {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div>}
        <div className="grid grid-cols-2 gap-4">
          <div><label className={lc}>Vehicle Name</label><input className={ic} placeholder="Peugeot 208" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className={lc}>Plate Number</label><input className={ic} placeholder="ABC-1234" value={form.plate || ""} onChange={(e) => setForm({ ...form, plate: e.target.value })} /></div>
          <div><label className={lc}>Brand</label><input className={ic} placeholder="Peugeot" value={form.brand || ""} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></div>
          <div><label className={lc}>Model</label><input className={ic} placeholder="208" value={form.model || ""} onChange={(e) => setForm({ ...form, model: e.target.value })} /></div>
          <div><label className={lc}>Year</label><input type="number" className={ic} placeholder="2023" value={form.year || ""} onChange={(e) => setForm({ ...form, year: +e.target.value })} /></div>
          <div><label className={lc}>Vehicle Type</label>
            <select className={ic} value={form.type || ""} onChange={(e) => setForm({ ...form, type: e.target.value as Vehicle["type"] })}>
              {vehicleTypes.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div><label className={lc}>Seating Capacity</label><input type="number" min={1} className={ic} placeholder="4" value={form.capacity || ""} onChange={(e) => setForm({ ...form, capacity: +e.target.value })} /></div>
          <div>
            <label className={lc}>Luggage Capacity</label>
            <div className={`${ic} flex items-center text-sm font-semibold text-gray-700 dark:text-slate-300`}>
              {vehicleLuggageCapacity(form)} item{vehicleLuggageCapacity(form) === 1 ? "" : "s"}
            </div>
          </div>
          <div><label className={lc}>Price / Day (රු)</label><input type="number" className={ic} placeholder="45" value={form.pricePerDay || ""} onChange={(e) => setForm({ ...form, pricePerDay: +e.target.value })} /></div>
          <div><label className={lc}>Transmission</label>
            <select className={ic} value={form.transmission || ""} onChange={(e) => setForm({ ...form, transmission: e.target.value as Vehicle["transmission"] })}>
              {transmissions.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div><label className={lc}>Fuel Type</label>
            <select className={ic} value={form.fuel || ""} onChange={(e) => setForm({ ...form, fuel: e.target.value as Vehicle["fuel"] })}>
              {fuels.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div><label className={lc}>Location</label><input className={ic} placeholder="Colombo, Sri Lanka" value={form.location || ""} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
          {!isTransportProvider && <div><label className={lc}>Status</label>
            <select className={ic} value={form.status || ""} onChange={(e) => setForm({ ...form, status: e.target.value as Vehicle["status"] })}>
              {statusList.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>}
          {!isTransportProvider && <div><label className={lc}>Transport Provider Owner</label><select className={ic} value={ownerUserId} onChange={(e) => setOwnerUserId(e.target.value)}><option value="">Voyara admin</option>{providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.fullName} · {provider.email}</option>)}</select></div>}
          <div className="col-span-2"><label className={lc}>Image URL</label><input className={ic} placeholder="https://..." value={form.image || ""} onChange={(e) => setForm({ ...form, image: e.target.value })} /></div>
          <div className="col-span-2">
            <label className={lc}>Features & Amenities</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {allFeatures.map(f => { const on = (form.features||[]).includes(f); return <button key={f} type="button" onClick={() => toggleFeature(f)} className="px-3 py-1.5 rounded-full text-xs font-medium transition-all" style={{ background: on ? "#FF385C" : "#f3f4f6", color: on ? "white" : "#374151", border: on ? "1px solid #FF385C" : "1px solid #e5e7eb" }}>{f}</button>; })}
            </div>
          </div>
        </div>
        <div className="flex gap-3 justify-end pt-5 mt-5 border-t border-gray-100 dark:border-slate-700">
          <button onClick={() => setOpen(false)} className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/40">Cancel</button>
          <button onClick={save} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90" style={{ background: "linear-gradient(135deg, #FF385C, #E31C5F)" }}>{edit ? "Save Changes" : "Add Vehicle"}</button>
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!delId} onClose={() => setDelId(null)} onConfirm={del} title="Delete Vehicle?" message="This permanently deletes the vehicle. Vehicles with booking history cannot be deleted and should be set to Inactive instead." />
    </div>
  );
}

function vehicleLuggageCapacity(vehicle: Pick<Vehicle, "capacity" | "luggageCapacity"> | Partial<Vehicle>) {
  return Math.max(1, Number(vehicle.luggageCapacity ?? Math.floor(Number(vehicle.capacity || 0) / 2)));
}
