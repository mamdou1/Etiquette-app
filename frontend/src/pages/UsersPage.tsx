import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { AppUser, createUser, getUsers, setUserStatus, updateUser } from "../services/userService";

const emptyForm = { nom: "", email: "", password: "", role: "user" };

const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadUsers = async () => {
    try { setLoading(true); setUsers(await getUsers()); } catch (err: any) { setError(err.response?.data?.message || "Impossible de charger les utilisateurs."); } finally { setLoading(false); }
  };
  useEffect(() => { loadUsers(); }, []);
  if (currentUser?.role !== "admin") return <Navigate to="/" replace />;

  const openModal = (user?: AppUser) => {
    setEditing(user || null);
    setForm(user ? { nom: user.nom, email: user.email, password: "", role: user.role } : emptyForm);
    setError(""); setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditing(null); setForm(emptyForm); };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      if (editing) await updateUser(editing.id, form);
      else await createUser(form);
      setMessage(editing ? "✅ Utilisateur mis à jour." : "✅ Utilisateur créé.");
      closeModal(); await loadUsers();
    } catch (err: any) { setError(err.response?.data?.message || "Impossible d'enregistrer l'utilisateur."); }
    finally { setSaving(false); }
  };
  const changeStatus = async (user: AppUser) => {
    const verb = user.active ? "désactiver" : "réactiver";
    if (!window.confirm(`Voulez-vous ${verb} le compte de ${user.nom} ?`)) return;
    try { await setUserStatus(user.id, !user.active); setMessage(`✅ Compte ${user.active ? "désactivé" : "réactivé"}.`); await loadUsers(); }
    catch (err: any) { setError(err.response?.data?.message || "Impossible de modifier le statut."); }
  };

  return <div className="w-full">
    <div className="mb-6"><h1 className="text-2xl font-bold text-primary">👥 Gestion des utilisateurs</h1><p className="text-sm text-muted font-mono mt-1">Créez et administrez les accès à l’application. Modifiez le rôle d’un compte pour transférer l’administration.</p></div>
    <div className="p-6 bg-white rounded-lg shadow-sm border border-border">
      <div className="flex justify-between items-center gap-4 mb-6"><p className="font-mono text-xs text-muted">{users.length} utilisateur{users.length > 1 ? "s" : ""}</p><button onClick={() => openModal()} className="bg-accent hover:bg-red-700 text-white px-4 py-2 rounded font-mono text-sm">+ Nouvel utilisateur</button></div>
      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded font-mono text-sm">⚠ {error}</div>}
      {message && <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded font-mono text-sm">{message}</div>}
      {loading ? <div className="py-12 text-center font-mono text-muted">Chargement…</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-surface border-b border-border"><th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase">Utilisateur</th><th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase">Rôle</th><th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase">Statut</th><th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase">Créé le</th><th className="px-4 py-3 text-left font-mono text-[10px] text-muted uppercase">Actions</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-b border-border hover:bg-surface/50"><td className="px-4 py-3"><p className="font-medium">{user.nom}{user.id === currentUser.id && <span className="ml-2 text-[10px] text-muted font-mono">(vous)</span>}</p><p className="font-mono text-xs text-muted">{user.email}</p></td><td className="px-4 py-3"><span className={`px-2 py-1 rounded text-[10px] font-mono ${user.role === "admin" ? "bg-accent/10 text-accent" : "bg-blue-50 text-blue-700"}`}>{user.role === "admin" ? "Administrateur" : "Utilisateur"}</span></td><td className="px-4 py-3"><span className={`px-2 py-1 rounded text-[10px] font-mono ${user.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{user.active ? "🟢 Actif" : "🔴 Désactivé"}</span></td><td className="px-4 py-3 font-mono text-xs text-muted">{user.created_at ? new Date(user.created_at).toLocaleDateString("fr-FR") : "—"}</td><td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => openModal(user)} className="text-blue-600 text-xs font-mono hover:underline">✏️ Modifier</button><button disabled={user.id === currentUser.id} onClick={() => changeStatus(user)} className="text-xs font-mono text-red-600 hover:underline disabled:text-muted disabled:no-underline">{user.active ? "Désactiver" : "Réactiver"}</button></div></td></tr>)}</tbody></table></div>}
    </div>
    {showModal && <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={closeModal}><form onSubmit={submit} onClick={(event) => event.stopPropagation()} className="bg-white rounded-lg shadow-xl border border-border p-6 max-w-md w-full space-y-4"><div className="flex justify-between items-center"><h2 className="text-lg font-bold text-primary">{editing ? "Modifier l’utilisateur" : "Nouvel utilisateur"}</h2><button type="button" onClick={closeModal} className="text-xl text-muted">✕</button></div><div><label className="block font-mono text-xs text-muted mb-1">Nom complet</label><input required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="w-full border border-border px-3 py-2 rounded font-mono text-sm focus:outline-none focus:border-accent" /></div><div><label className="block font-mono text-xs text-muted mb-1">E-mail</label><input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-border px-3 py-2 rounded font-mono text-sm focus:outline-none focus:border-accent" /></div><div><label className="block font-mono text-xs text-muted mb-1">{editing ? "Nouveau mot de passe (optionnel)" : "Mot de passe"}</label><input required={!editing} minLength={8} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="w-full border border-border px-3 py-2 rounded font-mono text-sm focus:outline-none focus:border-accent" /></div><div><label className="block font-mono text-xs text-muted mb-1">Rôle</label><select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="w-full border border-border px-3 py-2 rounded font-mono text-sm"><option value="user">Utilisateur</option><option value="admin">Administrateur</option></select></div>{error && <p className="text-red-600 text-xs font-mono">⚠ {error}</p>}<button disabled={saving} className="w-full bg-accent text-white py-3 rounded font-mono text-sm font-bold disabled:bg-border">{saving ? "Enregistrement…" : "Enregistrer"}</button></form></div>}
  </div>;
};

export default UsersPage;
