import { useEffect, useState } from "react";
import { BriefcaseBusiness, CheckCircle2, Eye, EyeOff, Mail, Phone, Plus, ShieldCheck, Trash2, Users } from "lucide-react";
import { ConfirmDialog, Modal, PageHeader, StatCard, ic, lc } from "../../components/Modal";
import { accessControlApi, guidesApi, stakeholdersApi, type AccessRole, type Guide, type Stakeholder } from "../../lib/api";

const stakeholderTypes = ["Tour Guide", "Hotel Partner", "Transport Provider", "Travel Staff", "Other"];
const roleLabel: Record<string, string> = { TOUR_GUIDE: "Tour Guide", HOTEL_PARTNER: "Hotel Partner", TRANSPORT_PROVIDER: "Transport Provider", TRAVEL_STAFF: "Travel Staff" };

function guideAsStakeholder(guide: Guide): Stakeholder {
  return {
    id: -guide.id,
    fullName: guide.name,
    email: guide.email || "Registered guide profile",
    phone: guide.location ? `${guide.location}${guide.country ? `, ${guide.country}` : ""}` : "Location not provided",
    stakeholderType: "TOUR_GUIDE",
    roleId: null,
    accessProfile: "TOUR_GUIDE",
    accountStatus: guide.status,
    source: "GUIDE_PROFILE",
    location: guide.location,
    country: guide.country,
  };
}

export function StakeholderManagement() {
  const [stakeholders, setStakeholders] = useState<Stakeholder[]>([]);
  const [roles, setRoles] = useState<AccessRole[]>([]);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", stakeholderType: "TOUR_GUIDE", roleId: "", accountStatus: "Active" });
  const [showPassword, setShowPassword] = useState(false);
  const [filterType, setFilterType] = useState("ALL");
  const [editing, setEditing] = useState<Stakeholder | null>(null);
  const [editRoleId, setEditRoleId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([stakeholdersApi.list(), accessControlApi.roles(), guidesApi.list()]).then(([members, accessRoles, guides]) => {
      const linkedUserIds = new Set(members.map((member) => member.id));
      setStakeholders([...members, ...guides.filter((guide) => !guide.userId || !linkedUserIds.has(guide.userId)).map(guideAsStakeholder)]); setRoles(accessRoles.filter((role) => !["ADMIN", "TOURIST"].includes(role.roleName)));
      const defaultRole = accessRoles.find((role) => role.roleName === "TOUR_GUIDE");
      if (defaultRole) setForm((current) => ({ ...current, roleId: String(defaultRole.id) }));
    }).catch((err) => setError(err instanceof Error ? err.message : "Could not load stakeholders")).finally(() => setLoading(false));
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.roleId) { setError("Please select an access profile."); return; }
    setSaving(true); setError("");
    try {
      const created = await stakeholdersApi.create({ ...form, roleId: Number(form.roleId) });
      setStakeholders((items) => [created, ...items]);
      setForm({ fullName: "", email: "", phone: "", password: "", stakeholderType: "TOUR_GUIDE", roleId: form.roleId, accountStatus: "Active" });
    } catch (err) { setError(err instanceof Error ? err.message : "Could not create stakeholder"); }
    finally { setSaving(false); }
  };

  const openEdit = (member: Stakeholder) => {
    setEditing(member);
    setEditRoleId(member.roleId ? String(member.roleId) : "");
    setNewPassword("");
  };

  const updateAccess = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing || !editRoleId) return;
    if (newPassword && newPassword.length < 8) { setError("Password must be at least 8 characters."); return; }
    setUpdating(true); setError("");
    try {
      const updated = await stakeholdersApi.updateAccess(editing.id, { roleId: Number(editRoleId), ...(newPassword ? { password: newPassword } : {}) });
      setStakeholders((items) => items.map((item) => item.id === updated.id ? updated : item));
      setEditing(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Could not update stakeholder"); }
    finally { setUpdating(false); }
  };

  const remove = async () => {
    if (deleteId === null) return;
    try {
      await stakeholdersApi.remove(deleteId);
      setStakeholders((items) => items.filter((item) => item.id !== deleteId));
      setDeleteId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete stakeholder");
    }
  };

  const filteredStakeholders = filterType === "ALL"
    ? stakeholders
    : stakeholders.filter((member) => member.stakeholderType === filterType);

  return <div className="space-y-6"><PageHeader icon={BriefcaseBusiness} eyebrow="Settings" title="Stakeholders" subtitle="Add partners and staff members with controlled access" />
    {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><StatCard icon={Users} label="Stakeholders" value={stakeholders.length} bg="#eff6ff" color="#0057B8" /><StatCard icon={CheckCircle2} label="Active accounts" value={stakeholders.filter((item) => item.accountStatus === "Active").length} bg="#f0fdf4" color="#16a34a" /><StatCard icon={ShieldCheck} label="Access profiles" value={roles.length} bg="#fff0f3" color="#FF385C" /></div>
    <section className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"><div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"><Plus className="h-5 w-5" /></div><div><h2 className="font-bold text-gray-900 dark:text-white">Add Stakeholder</h2><p className="text-xs text-gray-400">Create an account with a selected access profile.</p></div></div>
      <form onSubmit={submit} className="grid grid-cols-1 gap-4 md:grid-cols-2"><label><span className={lc}>Full Name</span><input className={ic} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></label><label><span className={lc}>Email</span><input type="email" className={ic} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label><label><span className={lc}>Phone</span><input className={ic} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></label><label><span className={lc}>Password</span><div className="relative"><input type={showPassword ? "text" : "password"} minLength={8} className={`${ic} pr-10`} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div><span className="mt-1 block text-xs text-gray-400">Minimum 8 characters</span></label><label><span className={lc}>Stakeholder Type</span><select className={ic} value={form.stakeholderType} onChange={(e) => setForm({ ...form, stakeholderType: e.target.value })}>{stakeholderTypes.map((type) => <option key={type} value={type === "Tour Guide" ? "TOUR_GUIDE" : type === "Hotel Partner" ? "HOTEL_PARTNER" : type === "Transport Provider" ? "TRANSPORT_PROVIDER" : type === "Travel Staff" ? "TRAVEL_STAFF" : "OTHER"}>{type}</option>)}</select></label><label><span className={lc}>Access Profile</span><select className={ic} value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} required><option value="">Select access profile</option>{roles.map((role) => <option key={role.id} value={role.id}>{roleLabel[role.roleName] || role.roleName}</option>)}</select></label><label><span className={lc}>Account Status</span><select className={ic} value={form.accountStatus} onChange={(e) => setForm({ ...form, accountStatus: e.target.value })}><option>Pending Invitation</option><option>Active</option><option>Suspended</option></select></label><div className="md:col-span-2"><button disabled={saving} className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60" style={{ background: "#0057B8" }}><Plus className="h-4 w-4" />{saving ? "Creating..." : "Create Stakeholder"}</button></div></form>
    </section>
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-800"><div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700"><div><h2 className="font-bold text-gray-900 dark:text-white">Registered stakeholders</h2><p className="mt-1 text-xs text-gray-400">View registered partners, staff, and tour guides.</p></div><select className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200" value={filterType} onChange={(event) => setFilterType(event.target.value)} aria-label="Filter stakeholders by type"><option value="ALL">All stakeholders</option><option value="HOTEL_PARTNER">Hotel providers</option><option value="TRANSPORT_PROVIDER">Transport providers</option><option value="TOUR_GUIDE">Tour guides</option><option value="TRAVEL_STAFF">Travel staff</option><option value="OTHER">Other</option></select></div>{loading ? <div className="px-5 py-10 text-sm text-gray-400">Loading stakeholders...</div> : filteredStakeholders.length === 0 ? <div className="px-5 py-10 text-sm text-gray-400">No stakeholders found for this type.</div> : <div className="divide-y divide-gray-100 dark:divide-slate-700">{filteredStakeholders.map((member) => <div key={`${member.source || "ACCOUNT"}-${member.id}`} onClick={() => member.source !== "GUIDE_PROFILE" && openEdit(member)} className={`flex items-center gap-4 px-5 py-4 ${member.source !== "GUIDE_PROFILE" ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700/30" : ""}`} title={member.source === "GUIDE_PROFILE" ? "Guide profile without a stakeholder login" : "Click to update access level or password"}><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 font-bold text-rose-600">{member.fullName.slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="font-semibold text-gray-900 dark:text-white">{member.fullName}</p><p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400"><span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{member.email}</span><span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{member.phone}</span></p></div><span className="hidden rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 sm:inline-flex">{member.source === "GUIDE_PROFILE" ? "Tour Guide" : roleLabel[member.accessProfile] || member.accessProfile}</span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${member.accountStatus === "Active" || member.accountStatus === "Available" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>{member.accountStatus}</span>{member.source !== "GUIDE_PROFILE" && <button type="button" onClick={(event) => { event.stopPropagation(); setDeleteId(member.id); }} className="rounded-lg p-2 text-red-500 hover:bg-red-50" title="Delete stakeholder" aria-label={`Delete ${member.fullName}`}><Trash2 className="h-4 w-4" /></button>}</div>)}</div>}</section>
    <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Update stakeholder access" subtitle={editing ? `Change access level or password for ${editing.fullName}` : undefined}>
      <form onSubmit={updateAccess} className="space-y-4">
        <label><span className={lc}>Access Profile</span><select className={ic} value={editRoleId} onChange={(event) => setEditRoleId(event.target.value)} required><option value="">Select access profile</option>{roles.map((role) => <option key={role.id} value={role.id}>{roleLabel[role.roleName] || role.roleName}</option>)}</select></label>
        <label><span className={lc}>New Password</span><input type="password" minLength={8} className={ic} placeholder="Leave blank to keep current password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><span className="mt-1 block text-xs text-gray-400">Minimum 8 characters when changing the password.</span></label>
        <div className="flex justify-end gap-3 border-t border-gray-100 pt-4 dark:border-slate-700"><button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 dark:border-slate-600 dark:text-slate-300">Cancel</button><button type="submit" disabled={updating} className="rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60" style={{ background: "#0057B8" }}>{updating ? "Saving..." : "Save changes"}</button></div>
      </form>
    </Modal>
    <ConfirmDialog isOpen={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={remove} title="Delete stakeholder account?" message="This removes the stakeholder login and notifications. Any linked guide profile and booking history will remain." />
  </div>;
}
