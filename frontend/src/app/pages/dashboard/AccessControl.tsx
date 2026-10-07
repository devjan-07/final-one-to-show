import { useEffect, useState } from "react";
import { Edit2, KeyRound, Plus, ShieldCheck, Trash2, Users, X } from "lucide-react";
import { ConfirmDialog, Modal, PageHeader, StatCard, ic, lc } from "../../components/Modal";
import { accessControlApi, type AccessPermission, type AccessRole } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

export function AccessControl() {
  const { refreshUser } = useAuth();
  const [roles, setRoles] = useState<AccessRole[]>([]);
  const [permissions, setPermissions] = useState<AccessPermission[]>([]);
  const [selected, setSelected] = useState<AccessRole | null>(null);
  const [name, setName] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = () => {
    setLoading(true);
    Promise.all([accessControlApi.roles(), accessControlApi.permissions()])
      .then(([loadedRoles, loadedPermissions]) => { setRoles(loadedRoles); setPermissions(loadedPermissions); })
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load access control"))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openRole = (role?: AccessRole) => {
    setSelected(role || null);
    setName(role?.roleName || "");
    setSelectedPermissions(role?.permissions.map((permission) => permission.id) || []);
    setError("");
    setOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = { roleName: name, permissionIds: selectedPermissions };
      const saved = selected ? await accessControlApi.updateRole(selected.id, payload) : await accessControlApi.createRole(payload);
      setRoles((items) => selected ? items.map((item) => item.id === saved.id ? saved : item) : [...items, saved]);
      setOpen(false);
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save role");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (deleteId === null) return;
    try {
      await accessControlApi.removeRole(deleteId);
      setRoles((items) => items.filter((item) => item.id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete role");
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader icon={ShieldCheck} eyebrow="Settings" title="Access Control" subtitle="Create roles and define their system access levels" actionLabel="Create role" onAction={() => openRole()} />
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={ShieldCheck} label="Roles" value={roles.length} bg="#eff6ff" color="#0057B8" />
        <StatCard icon={KeyRound} label="Permissions" value={permissions.length} bg="#fff0f3" color="#FF385C" />
        <StatCard icon={Users} label="Protected access" value="Admin only" bg="#f0fdf4" color="#16a34a" />
      </div>
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-slate-700"><h2 className="font-bold text-gray-900 dark:text-white">Roles and access levels</h2><p className="mt-0.5 text-xs text-gray-400">Select a role to edit its permissions.</p></div>
        {loading ? <div className="px-5 py-12 text-sm text-gray-400">Loading roles...</div> : <div className="divide-y divide-gray-100 dark:divide-slate-700">{roles.map((role) => <button key={role.id} onClick={() => openRole(role)} className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-slate-700/50"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"><ShieldCheck className="h-5 w-5" /></span><span className="min-w-0 flex-1"><span className="block font-semibold text-gray-900 dark:text-white">{role.roleName}</span><span className="mt-1 block text-xs text-gray-400">{role.permissions.length} permission{role.permissions.length === 1 ? "" : "s"}</span></span><span className="hidden flex-wrap justify-end gap-1 md:flex">{role.permissions.slice(0, 4).map((permission) => <span key={permission.id} className="rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-600 dark:bg-slate-700 dark:text-slate-300">{permission.code}</span>)}{role.permissions.length > 4 && <span className="px-2 py-1 text-[10px] text-gray-400">+{role.permissions.length - 4}</span>}</span><Edit2 className="h-4 w-4 shrink-0 text-gray-400" /></button>)}</div>}
      </section>
      <Modal isOpen={open} onClose={() => setOpen(false)} title={selected ? "Edit role" : "Create role"} subtitle="Choose the access levels this role can use">
        <form onSubmit={save} className="space-y-5"><label><span className={lc}>Role name</span><input className={ic} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Booking Manager" required /></label><div><span className={lc}>Permissions</span><div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{permissions.map((permission) => { const checked = selectedPermissions.includes(permission.id); return <label key={permission.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 p-3 hover:bg-gray-50 dark:border-slate-600 dark:hover:bg-slate-700"><input type="checkbox" checked={checked} onChange={() => setSelectedPermissions((items) => checked ? items.filter((id) => id !== permission.id) : [...items, permission.id])} className="mt-0.5 h-4 w-4 accent-rose-500" /><span><span className="block text-sm font-semibold text-gray-800 dark:text-slate-200">{permission.label}</span><span className="text-[10px] text-gray-400">{permission.code}</span></span></label>; })}</div></div><div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-slate-700">{selected && selected.roleName !== "ADMIN" ? <button type="button" onClick={() => setDeleteId(selected.id)} className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /> Delete role</button> : <span />}{selected && <button type="button" onClick={() => setOpen(false)} className="mr-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-500">Cancel</button>}<button disabled={saving} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60" style={{ background: "#0057B8" }}>{saving ? "Saving..." : selected ? "Save changes" : "Create role"}</button></div></form>
      </Modal>
      <ConfirmDialog isOpen={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={remove} title="Delete this role?" message="Users assigned to this role may lose access. The role cannot be recovered." />
    </div>
  );
}
