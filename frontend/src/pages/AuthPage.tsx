import React, { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const AuthPage: React.FC<{ mode: "login" | "register" }> = ({ mode }) => {
  const isLogin = mode === "login";
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const registrationSuccess = location.state?.registered;

  if (user) return <Navigate to="/" replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
        navigate(location.state?.from?.pathname || "/", { replace: true });
      } else {
        await register(nom, email, password);
        navigate("/connexion", { replace: true, state: { registered: true } });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Une erreur est survenue. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0ede8] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex bg-accent w-14 h-14 rounded-lg items-center justify-center font-mono font-bold text-lg text-white shadow-md mb-4">ÉT</div>
          <h1 className="text-2xl font-bold text-primary">{isLogin ? "Connexion" : "Créer un compte"}</h1>
          <p className="text-sm text-muted font-mono mt-2">Gestion des étiquettes d’archives</p>
        </div>
        <form onSubmit={submit} className="bg-white border border-border shadow-sm rounded-lg p-6 space-y-4">
          {!isLogin && <div><label className="block font-mono text-xs text-muted mb-1 font-semibold">Nom complet</label><input required value={nom} onChange={(e) => setNom(e.target.value)} className="w-full border border-border px-3 py-2.5 rounded font-mono text-sm outline-none focus:border-accent" placeholder="Votre nom" /></div>}
          <div><label className="block font-mono text-xs text-muted mb-1 font-semibold">Adresse e-mail</label><input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-border px-3 py-2.5 rounded font-mono text-sm outline-none focus:border-accent" placeholder="nom@organisation.com" /></div>
          <div><label className="block font-mono text-xs text-muted mb-1 font-semibold">Mot de passe</label><input required minLength={8} type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-border px-3 py-2.5 rounded font-mono text-sm outline-none focus:border-accent" placeholder="Au moins 8 caractères" /></div>
          {registrationSuccess && isLogin && <p className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded text-xs font-mono">✅ Compte créé. Connectez-vous pour continuer.</p>}
          {error && <p className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded text-xs font-mono">⚠ {error}</p>}
          <button disabled={loading} className="w-full bg-accent hover:bg-red-700 disabled:bg-border text-white py-3 rounded font-mono text-sm font-bold transition-colors">{loading ? "Patientez…" : isLogin ? "Se connecter" : "Créer mon compte"}</button>
        </form>
        <p className="text-center text-sm text-muted mt-5">{isLogin ? "Vous n’avez pas de compte ?" : "Vous avez déjà un compte ?"} <Link className="text-accent font-medium hover:underline" to={isLogin ? "/inscription" : "/connexion"}>{isLogin ? "Créer un compte" : "Se connecter"}</Link></p>
      </div>
    </div>
  );
};

export default AuthPage;
