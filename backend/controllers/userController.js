const bcrypt = require("bcryptjs");
const { UserModel } = require("../models");

function validEmail(email) {
  return /^\S+@\S+\.\S+$/.test(String(email || "").trim());
}

const getUsers = async (_req, res) => {
  try {
    return res.json({ success: true, data: await UserModel.findAll() });
  } catch {
    return res.status(500).json({ success: false, message: "Impossible de récupérer les utilisateurs." });
  }
};

const createUser = async (req, res) => {
  try {
    const { nom, email, password, role } = req.body;
    if (!nom?.trim() || !validEmail(email) || !password || password.length < 8) {
      return res.status(400).json({ success: false, message: "Nom, e-mail valide et mot de passe de 8 caractères minimum sont requis." });
    }
    if (await UserModel.findByEmail(email)) {
      return res.status(409).json({ success: false, message: "Cette adresse e-mail est déjà utilisée." });
    }
    const user = await UserModel.create({ nom, email, role, passwordHash: await bcrypt.hash(password, 12) });
    return res.status(201).json({ success: true, data: user, message: "Utilisateur créé." });
  } catch {
    return res.status(500).json({ success: false, message: "Impossible de créer l'utilisateur." });
  }
};

const updateUser = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nom, email, password, role } = req.body;
    const target = await UserModel.findById(id);
    if (!target) return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
    if (!nom?.trim() || !validEmail(email) || (password && password.length < 8)) {
      return res.status(400).json({ success: false, message: "Les informations saisies sont invalides." });
    }
    const existing = await UserModel.findByEmail(email);
    if (existing && existing.id !== id) return res.status(409).json({ success: false, message: "Cette adresse e-mail est déjà utilisée." });
    if (target.id === req.auth.userId && role !== "admin" && await UserModel.countActiveAdmins() <= 1) {
      return res.status(400).json({ success: false, message: "Désignez d'abord un autre administrateur avant de retirer votre rôle." });
    }
    const user = await UserModel.update(id, { nom, email, role, passwordHash: password ? await bcrypt.hash(password, 12) : undefined });
    return res.json({ success: true, data: user, message: "Utilisateur mis à jour." });
  } catch {
    return res.status(500).json({ success: false, message: "Impossible de modifier l'utilisateur." });
  }
};

const setUserStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const active = Boolean(req.body.active);
    const target = await UserModel.findById(id);
    if (!target) return res.status(404).json({ success: false, message: "Utilisateur introuvable." });
    if (target.id === req.auth.userId && !active) {
      return res.status(400).json({ success: false, message: "Vous ne pouvez pas désactiver votre propre compte." });
    }
    if (!active && target.role === "admin" && await UserModel.countActiveAdmins() <= 1) {
      return res.status(400).json({ success: false, message: "Au moins un administrateur actif doit être conservé." });
    }
    const user = await UserModel.setActive(id, active);
    return res.json({ success: true, data: user, message: active ? "Utilisateur réactivé." : "Utilisateur désactivé." });
  } catch {
    return res.status(500).json({ success: false, message: "Impossible de modifier le statut." });
  }
};

module.exports = { getUsers, createUser, updateUser, setUserStatus };
