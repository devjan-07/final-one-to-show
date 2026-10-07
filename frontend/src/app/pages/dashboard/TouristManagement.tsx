import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Edit2, Mail, Phone, Search, Trash2, UserRound, Users, X } from "lucide-react";
import { ConfirmDialog, Modal, PageHeader, StatCard, ic, lc } from "../../components/Modal";
import { adminTouristsApi, type AdminTourist } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

type TouristForm = {
  fullName: string;
  email: string;
  phone: string;
  active: boolean;
  nationality: string;
  passportNumber: string;
  preferences: string;
};

const emptyForm: TouristForm = {
  fullName: "", email: "", phone: "", active: true, nationality: "", passportNumber: "", preferences: "",
};

function formFromTourist(tourist: AdminTourist): TouristForm {
  return {
    fullName: tourist.fullName || "",
    email: tourist.email || "",
    phone: tourist.phone || "",
    active: tourist.active,
    nationality: tourist.nationality || "",
    passportNumber: tourist.passportNumber || "",
    preferences: tourist.preferences || "",
  };
}

function joinedDate(value?: string) {
  if (!value) return "Unknown";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function TouristManagement() {
  const { user } = useAuth();
  const canEdit = user?.permissions?.includes("TOURISTS_EDIT") ?? false;
  const canDelete = user?.permissions?.includes("TOURISTS_DELETE") ?? false;
  const [tourists, setTourists] = useState<AdminTourist[]>([]);
  const [selected, setSelected] = useState<AdminTourist | null>(null);
  const [form, setForm] = useState<TouristForm>(emptyForm);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const loadTourists = () => {
    setLoading(true);
    adminTouristsApi.list()
      .then(setTourists)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load tourists"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadTourists(); }, []);

  const filteredTourists = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return tourists;
    return tourists.filter((tourist) => [tourist.fullName, tourist.email, tourist.phone, tourist.nationality].filter(Boolean).join(" ").toLowerCase().includes(value));
  }, [query, tourists]);

  const openEdit = (tourist: AdminTourist) => {
    setSelected(tourist);
    setForm(formFromTourist(tourist));
    setError("");
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const updated = await adminTouristsApi.update(selected.id, form);
      setTourists((items) => items.map((item) => item.id === updated.id ? updated : item));
      setSelected(updated);
      setForm(formFromTourist(updated));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save tourist");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (deleteId === null) return;
    try {
      await adminTouristsApi.remove(deleteId);
      setTourists((items) => items.filter((item) => item.id !== deleteId));
      if (selected?.id === deleteId) setSelected(null);
      setDeleteId(null);
      setError("");
    } catch (err) {
      setDeleteId(null);
      setError(err instanceof Error ? err.message : "Could not delete tourist");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={Users} eyebrow="People" title="Registered Tourists" subtitle="View and manage tourist accounts and profile details" />

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Total tourists" value={tourists.length} bg="#eff6ff" color="#0057B8" />
        <StatCard icon={UserRound} label="Active accounts" value={tourists.filter((tourist) => tourist.active).length} bg="#f0fdf4" color="#16a34a" />
        <StatCard icon={Mail} label="Verified email" value={tourists.filter((tourist) => tourist.emailVerified).length} bg="#fff0f3" color="#FF385C" />
      </div>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 dark:border-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-gray-900 dark:text-white">Tourist accounts</h2>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-slate-500">Click an account to edit or delete it</p>
          </div>
          <label className="flex w-full items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 sm:w-72 dark:border-slate-600 dark:text-slate-400">
            <Search className="h-4 w-4" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tourists" className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-gray-400" />
          </label>
        </div>

        {loading ? <div className="px-5 py-12 text-sm text-gray-400">Loading registered tourists...</div> : filteredTourists.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-gray-400">No tourists match your search.</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {filteredTourists.map((tourist) => (
              <button key={tourist.id} onClick={() => openEdit(tourist)} className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-slate-700/50">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">{tourist.fullName.trim().slice(0, 1).toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 font-semibold text-gray-900 dark:text-white">
                    {tourist.fullName}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tourist.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>{tourist.active ? "Active" : "Inactive"}</span>
                  </span>
                  <span className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 dark:text-slate-500"><span>{tourist.email}</span><span>{tourist.nationality || "Nationality not provided"}</span></span>
                </span>
                <span className="hidden text-right text-xs text-gray-400 md:block">Joined<br /><strong className="font-semibold text-gray-600 dark:text-slate-300">{joinedDate(tourist.createdAt)}</strong></span>
                <Edit2 className="h-4 w-4 shrink-0 text-gray-400" />
              </button>
            ))}
          </div>
        )}
      </section>

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title="Tourist details" subtitle={selected ? `Account #${selected.id}` : undefined}>
        {selected && <form onSubmit={save} className="space-y-5">
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 p-4 dark:bg-slate-700/50"><span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-lg font-bold text-blue-700">{selected.fullName.trim().slice(0, 1).toUpperCase()}</span><div><p className="font-bold text-gray-900 dark:text-white">{selected.fullName}</p><p className="text-xs text-gray-500 dark:text-slate-400">{selected.emailVerified ? "Email verified" : "Email not verified"}</p></div></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label><span className={lc}>Full name</span><input className={ic} value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required /></label>
            <label><span className={lc}>Email</span><input type="email" className={ic} value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label>
            <label><span className={lc}>Phone</span><input className={ic} value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></label>
            <label><span className={lc}>Nationality</span><input className={ic} value={form.nationality} onChange={(event) => setForm({ ...form, nationality: event.target.value })} /></label>
            <label><span className={lc}>Passport number</span><input className={ic} value={form.passportNumber} onChange={(event) => setForm({ ...form, passportNumber: event.target.value })} /></label>
            <label className="flex items-center gap-3 self-end rounded-xl border border-gray-200 px-3.5 py-2.5 dark:border-slate-600"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="h-4 w-4 accent-rose-500" /><span className="text-sm font-semibold text-gray-700 dark:text-slate-300">Account active</span></label>
          </div>
          <label><span className={lc}>Travel preferences</span><textarea className={`${ic} min-h-24 resize-y`} value={form.preferences} onChange={(event) => setForm({ ...form, preferences: event.target.value })} /></label>
          <div className="flex flex-col-reverse gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:justify-between dark:border-slate-700"><button type="button" disabled={!canDelete || saving} onClick={() => setDeleteId(selected.id)} className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"><Trash2 className="h-4 w-4" /> Delete tourist</button><button disabled={saving || !canEdit} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60" style={{ background: "#0057B8" }}>{saving ? "Saving..." : "Save changes"}</button></div>
        </form>}
      </Modal>
      <ConfirmDialog isOpen={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={remove} title="Delete tourist account?" message="Only accounts without booking history can be deleted. This removes the account, profile, reviews, and notifications." />
    </div>
  );
}
