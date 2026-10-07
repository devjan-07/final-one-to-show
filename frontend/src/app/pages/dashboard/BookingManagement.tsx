import { useEffect, useState } from "react";
import { Search, Edit2, Trash2, CalendarCheck, Clock, Users, CheckCircle, XCircle, Eye } from "lucide-react";
import { Modal, ConfirmDialog, StatCard, PageHeader, RupeeIcon, ic, lc } from "../../components/Modal";
import { bookingsApi, type Booking } from "../../lib/api";

const statusStyle: Record<string, { bg: string; color: string }> = {
  Confirmed: { bg: "#f0fdf4", color: "#16a34a" },
  Pending: { bg: "#fffbeb", color: "#d97706" },
  Completed: { bg: "#f0f9ff", color: "#0284c7" },
  Cancelled: { bg: "#fef2f2", color: "#dc2626" },
};
const payStyle: Record<string, { bg: string; color: string }> = {
  Paid: { bg: "#f0fdf4", color: "#16a34a" },
  Pending: { bg: "#fffbeb", color: "#d97706" },
  Refunded: { bg: "#fef2f2", color: "#dc2626" },
};

const tabs = ["All", "Confirmed", "Pending", "Completed", "Cancelled"];
const statuses = ["Confirmed", "Pending", "Cancelled", "Completed"];
const payments = ["Paid", "Pending", "Refunded"];

export function BookingManagement() {
  const [items, setItems] = useState<Booking[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("All");
  const [open, setOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [edit, setEdit] = useState<Booking | null>(null);
  const [view, setView] = useState<Booking | null>(null);
  const [form, setForm] = useState<Partial<Booking>>({});
  const [delId, setDelId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    bookingsApi.list().then(setItems).catch(error => setError(error.message || "Failed to load bookings"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = items.filter((b) =>
    (b.guest.toLowerCase().includes(search.toLowerCase()) || b.destination.toLowerCase().includes(search.toLowerCase()) || b.id.toLowerCase().includes(search.toLowerCase())) &&
    (tab === "All" || b.status === tab)
  );

  const openAdd = () => { setEdit(null); setForm({ status: "Pending", payment: "Pending", guests: 1, rooms: 1 }); setOpen(true); };
  const openEdit = (b: Booking) => { setEdit(b); setForm({ ...b }); setOpen(true); };
  const openView = (b: Booking) => { setView(b); setViewOpen(true); };
  const save = async () => {
    if (busy) return;
    if (!form.guest) { setError("Guest name is required"); return; }
    setBusy(true);
    setError("");
    const payload: Partial<Booking> = { bookingType: form.bookingType || "PACKAGE", packageId: form.packageId ?? null, languagePreference: form.languagePreference || "", email: form.email || "", destination: form.destination || "", pkg: form.pkg || "", guide: form.guide || "", guideSelectionType: form.guideId ? "VOYARA" : "OWN", guideId: form.guideId ?? null, accommodation: form.accommodation || "", accommodationSelectionType: form.accommodationId ? "VOYARA" : "OWN", accommodationId: form.accommodationId ?? null, roomType: form.roomType || "", vehicle: form.vehicle || "", vehicleSelectionType: form.vehicleId ? "VOYARA" : "OWN", vehicleId: form.vehicleId ?? null, pickupLocation: form.pickupLocation || "", pickupTime: form.pickupTime || "", returnLocation: form.returnLocation || "", returnTime: form.returnTime || "", driverRequired: form.driverRequired ?? true, luggageCount: form.luggageCount ?? 0, checkIn: form.checkIn || "", checkOut: form.checkOut || "", guests: form.guests || 1, rooms: form.rooms || 1, total: form.total || 0, status: form.status || "Pending", payment: form.payment || "Pending", notes: form.notes || "", createdAt: form.createdAt || new Date().toISOString().slice(0, 10), guest: form.guest! };
    try {
      if (edit) {
        const saved = await bookingsApi.update(edit.id, { ...payload, id: edit.id });
        setItems(items.map(i => i.id === edit.id ? saved : i));
      } else {
        const saved = await bookingsApi.create(payload);
        setItems([saved, ...items]);
      }
      setOpen(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to save booking");
    } finally {
      setBusy(false);
    }
  };
  const del = async () => {
    if (!delId || busy) return;
    setBusy(true);
    setError("");
    try {
      await bookingsApi.remove(delId);
      setItems(items.filter(i => i.id !== delId));
      setDelId(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to delete booking");
      setDelId(null);
    } finally {
      setBusy(false);
    }
  };
  const updateStatus = async (id: string, status: Booking["status"]) => {
    const booking = items.find(i => i.id === id);
    if (!booking || busy) return;
    setBusy(true);
    setError("");
    try {
      const saved = await bookingsApi.update(id, { ...booking, status });
      setItems(items.map(i => i.id === id ? saved : i));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to update booking status");
    } finally {
      setBusy(false);
    }
  };

  const revenue = items.filter(b => b.payment === "Paid").reduce((s, b) => s + b.total, 0);
  const pending = items.filter(b => b.status === "Pending").length;
  const completed = items.filter(b => b.status === "Completed").length;

  return (
    <div>
      <PageHeader icon={CalendarCheck} title="Bookings" subtitle="Review, confirm, and manage Voyara reservations" actionLabel="Add Booking" onAction={openAdd} />
      {error && !open && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
      {loading && <p role="status" className="mb-4 text-sm text-gray-500">Loading bookings...</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={CalendarCheck} label="Total Bookings" value={items.length} bg="#fff0f3" color="#FF385C" />
        <StatCard icon={RupeeIcon} label="Revenue Collected" value={`රු${revenue.toLocaleString()}`} bg="#f0fdf4" color="#16a34a" />
        <StatCard icon={Clock} label="Pending" value={pending} bg="#fffbeb" color="#d97706" />
        <StatCard icon={CheckCircle} label="Completed" value={completed} bg="#f0f9ff" color="#0284c7" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 dark:bg-slate-700 p-1 rounded-xl w-fit">
        {tabs.map((t) => (
          <button key={t} onClick={() => setTab(t)} className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all" style={{ background: tab === t ? "white" : "transparent", color: tab === t ? "#111" : "#6b7280", boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.1)" : "none" }}>
            {t} {t !== "All" && <span className="ml-1 text-xs" style={{ color: tab === t ? "#FF385C" : "#9ca3af" }}>({items.filter(b => b.status === t).length})</span>}
          </button>
        ))}
      </div>

      <div className="flex gap-3 mb-5">
        <div className="flex-1 relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-slate-500" />
          <input className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 placeholder:text-gray-400 dark:placeholder:text-slate-500 text-sm focus:outline-none" placeholder="Search by guest, destination or booking ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-gray-200 dark:border-slate-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-100 dark:border-slate-700">
                {["Booking ID", "Guest", "Package & Destination", "Dates", "Guests", "Total", "Status", "Payment", "Actions"].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
              {filtered.map((b) => {
                const ss = statusStyle[b.status];
                const ps = payStyle[b.payment];
                return (
                  <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-colors">
                    <td className="px-4 py-3.5"><span className="text-xs font-mono font-bold text-gray-500 dark:text-slate-400">{b.id}</span></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: "linear-gradient(135deg, #FF385C, #E31C5F)" }}>{b.guest.split(" ").map(n=>n[0]).join("")}</div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">{b.guest}</p>
                          <p className="text-xs text-gray-400 dark:text-slate-500">{b.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">{b.pkg}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">{b.destination}</p>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <p className="text-sm text-gray-800 dark:text-slate-200">{b.checkIn}</p>
                      <p className="text-xs text-gray-400 dark:text-slate-500">to {b.checkOut}</p>
                    </td>
                    <td className="px-4 py-3.5"><div className="flex items-center gap-1 text-sm text-gray-600 dark:text-slate-400"><Users className="w-3.5 h-3.5" />{b.guests}</div></td>
                    <td className="px-4 py-3.5"><span className="text-sm font-bold text-gray-900 dark:text-white whitespace-nowrap">රු{b.total.toLocaleString()}</span></td>
                    <td className="px-4 py-3.5"><span className="px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap" style={{ background: ss.bg, color: ss.color }}>{b.status}</span></td>
                    <td className="px-4 py-3.5"><span className="px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap" style={{ background: ps.bg, color: ps.color }}>{b.payment}</span></td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openView(b)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700" style={{ color: "#6b7280" }} title="View"><Eye className="w-4 h-4" /></button>
                        <button onClick={() => openEdit(b)} className="p-1.5 rounded-lg hover:bg-blue-50" style={{ color: "#3b82f6" }} title="Edit"><Edit2 className="w-4 h-4" /></button>
                        {b.status === "Pending" && <button onClick={() => updateStatus(b.id, "Confirmed")} className="p-1.5 rounded-lg hover:bg-green-50" style={{ color: "#16a34a" }} title="Confirm"><CheckCircle className="w-4 h-4" /></button>}
                        {b.status !== "Cancelled" && b.status !== "Completed" && <button onClick={() => updateStatus(b.id, "Cancelled")} className="p-1.5 rounded-lg hover:bg-orange-50" style={{ color: "#ea580c" }} title="Cancel"><XCircle className="w-4 h-4" /></button>}
                        <button onClick={() => setDelId(b.id)} className="p-1.5 rounded-lg hover:bg-red-50" style={{ color: "#ef4444" }} title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!loading && !error && !filtered.length && <div className="py-16 text-center text-gray-400 dark:text-slate-500"><CalendarCheck className="w-10 h-10 mx-auto mb-2 opacity-25" /><p>No bookings found</p></div>}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={open} onClose={() => setOpen(false)} title={edit ? "Edit Booking" : "New Booking"} subtitle="Fill in booking details" size="xl">
        {error && <p role="alert" className="mb-4 text-sm text-red-600">{error}</p>}
        <div className="grid grid-cols-2 gap-4">
          <div><label className={lc}>Guest Name</label><input className={ic} placeholder="John Smith" value={form.guest || ""} onChange={(e) => setForm({ ...form, guest: e.target.value })} /></div>
          <div><label className={lc}>Guest Email</label><input type="email" className={ic} placeholder="john@email.com" value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className={lc}>Destination</label><input className={ic} placeholder="Ella, Sri Lanka" value={form.destination || ""} onChange={(e) => setForm({ ...form, destination: e.target.value })} /></div>
          <div><label className={lc}>Tour Package</label><input className={ic} placeholder="Ella Highlands Tour" value={form.pkg || ""} onChange={(e) => setForm({ ...form, pkg: e.target.value })} /></div>
          <div><label className={lc}>Assigned Guide</label><input className={ic} placeholder="Guide name" value={form.guide || ""} onChange={(e) => setForm({ ...form, guide: e.target.value })} /></div>
          <div><label className={lc}>Accommodation</label><input className={ic} placeholder="Hotel name" value={accommodationName(form.accommodation)} onChange={(e) => setForm({ ...form, accommodation: e.target.value })} /></div>
          <div className="col-span-2"><label className={lc}>Vehicle</label><input className={ic} placeholder="Vehicle name or assignment" value={form.vehicle || ""} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} /></div>
          <div><label className={lc}>Start Date</label><input type="date" className={ic} value={form.checkIn || ""} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} /></div>
          <div><label className={lc}>End Date</label><input type="date" className={ic} value={form.checkOut || ""} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} /></div>
          <div><label className={lc}>Number of Guests</label><input type="number" min="1" className={ic} placeholder="2" value={form.guests || ""} onChange={(e) => setForm({ ...form, guests: +e.target.value })} /></div>
          <div><label className={lc}>Rooms</label><input type="number" min="1" className={ic} placeholder="1" value={form.rooms || ""} onChange={(e) => setForm({ ...form, rooms: +e.target.value })} /></div>
          <div><label className={lc}>Room Type</label><input className={ic} placeholder="Double" value={form.roomType || ""} onChange={(e) => setForm({ ...form, roomType: e.target.value })} /></div>
          <div><label className={lc}>Guide Language</label><input className={ic} placeholder="English" value={form.languagePreference || ""} onChange={(e) => setForm({ ...form, languagePreference: e.target.value })} /></div>
          <div><label className={lc}>Pickup Location</label><input className={ic} placeholder="Vehicle pickup location" value={form.pickupLocation || ""} onChange={(e) => setForm({ ...form, pickupLocation: e.target.value })} /></div>
          <div><label className={lc}>Pickup Time</label><input type="time" className={ic} value={form.pickupTime || ""} onChange={(e) => setForm({ ...form, pickupTime: e.target.value })} /></div>
          <div><label className={lc}>Return Location</label><input className={ic} placeholder="Vehicle return location" value={form.returnLocation || ""} onChange={(e) => setForm({ ...form, returnLocation: e.target.value })} /></div>
          <div><label className={lc}>Return Time</label><input type="time" className={ic} value={form.returnTime || ""} onChange={(e) => setForm({ ...form, returnTime: e.target.value })} /></div>
          <div><label className={lc}>Driver Required</label><select className={ic} value={form.driverRequired === false ? "No" : "Yes"} onChange={(e) => setForm({ ...form, driverRequired: e.target.value === "Yes" })}><option>Yes</option><option>No</option></select></div>
          <div><label className={lc}>Luggage Count</label><input type="number" min="0" className={ic} value={form.luggageCount ?? ""} onChange={(e) => setForm({ ...form, luggageCount: +e.target.value })} /></div>
          <div><label className={lc}>Total Amount (රු)</label><input type="number" className={ic} placeholder="510" value={form.total || ""} onChange={(e) => setForm({ ...form, total: +e.target.value })} /></div>
          <div><label className={lc}>Booking Status</label>
            <select className={ic} value={form.status || ""} onChange={(e) => setForm({ ...form, status: e.target.value as Booking["status"] })}>
              {statuses.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div><label className={lc}>Payment Status</label>
            <select disabled className={ic} value={form.payment || "Pending"}>
              {payments.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="col-span-2"><label className={lc}>Notes</label><textarea rows={2} className={ic} placeholder="Special requests or notes..." value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ resize: "none" }} /></div>
        </div>
        <div className="flex gap-3 justify-end pt-5 mt-5 border-t border-gray-100 dark:border-slate-700">
          <button onClick={() => setOpen(false)} className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-semibold text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700/40">Cancel</button>
          <button onClick={save} disabled={busy} className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold hover:opacity-90 disabled:opacity-50" style={{ background: "linear-gradient(135deg, #FF385C, #E31C5F)" }}>{busy ? "Saving..." : edit ? "Save Changes" : "Create Booking"}</button>
        </div>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={viewOpen} onClose={() => setViewOpen(false)} title={`Booking ${view?.id}`} subtitle={view?.pkg} size="md">
        {view && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {[
                ["Guest", view.guest], ["Email", view.email], ["Destination", view.destination], ["Package", view.pkg],
                ["Guide", view.guide || "—"], ["Accommodation", accommodationName(view.accommodation) || "—"], ["Vehicle", view.vehicle || "—"],
                ["Start Date", view.checkIn], ["End Date", view.checkOut],
                ["Guests", view.guests], ["Rooms", view.rooms || 1], ["Room Type", view.roomType || "—"], ["Guide Language", view.languagePreference || "—"], ["Pickup", view.pickupLocation || "—"], ["Pickup Time", view.pickupTime || "—"], ["Return", view.returnLocation || "—"], ["Return Time", view.returnTime || "—"], ["Driver", view.driverRequired === false ? "Self-drive" : "Required"], ["Luggage", view.luggageCount ?? 0], ["Total", `රු${view.total.toLocaleString()}`],
              ].map(([k, v]) => (
                <div key={k as string} className="p-3 rounded-xl bg-gray-50 dark:bg-slate-700/50">
                  <p className="text-xs text-gray-400 dark:text-slate-500 mb-0.5">{k}</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{v}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <span className="px-3 py-1.5 rounded-full text-sm font-semibold" style={{ background: statusStyle[view.status].bg, color: statusStyle[view.status].color }}>{view.status}</span>
              <span className="px-3 py-1.5 rounded-full text-sm font-semibold" style={{ background: payStyle[view.payment].bg, color: payStyle[view.payment].color }}>{view.payment}</span>
            </div>
            {view.notes && <div className="p-3 rounded-xl bg-gray-50 dark:bg-slate-700/50"><p className="text-xs text-gray-400 dark:text-slate-500 mb-1">Notes</p><p className="text-sm text-gray-700 dark:text-slate-300">{view.notes}</p></div>}
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={!!delId} onClose={() => setDelId(null)} onConfirm={del} title="Delete Booking?" message="This booking record will be permanently removed." />
    </div>
  );
}

function accommodationName(value?: string) {
  return value?.split(" · ")[0]?.trim() || "";
}
