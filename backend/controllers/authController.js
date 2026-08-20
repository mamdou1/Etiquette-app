const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { UserModel } = require("../models");

const JWT_SECRET = process.env.JWT_SECRET || "change-this-development-jwt-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";

function publicUser(user) {
  return { id: user.id, nom: user.nom, email: user.email, role: user.role, active: Boolean(user.active) };
}

function createToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

const register = async (req, res) => {
  try {
    const { nom, email, password } = req.body;
    if (!nom?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ success: false, message: "Nom, adresse e-mail et mot de passe sont requis." });
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      return res.status(400).json({ success: false, message: "L'adresse e-mail est invalide." });
    }
    if (password.length < 8) {
      return res.status(400).json({ success: false, message: "Le mot de passe doit contenir au moins 8 caractères." });
    }
    if (await UserModel.findByEmail(email)) {
      return res.status(409).json({ success: false, message: "Un compte existe déjà avec cette adresse e-mail." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const role = await UserModel.count() === 0 ? "admin" : "user";
    const user = await UserModel.create({ nom, email, passwordHash, role });
    return res.status(201).json({ success: true, user: publicUser(user), token: createToken(user) });
  } catch (error) {
    console.error("Erreur inscription:", error);
    return res.status(500).json({ success: false, message: "Impossible de créer le compte." });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = email ? await UserModel.findByEmail(email) : null;
    if (!user || !password || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ success: false, message: "Adresse e-mail ou mot de passe incorrect." });
    }
    if (!user.active) {
      return res.status(403).json({ success: false, message: "Ce compte est désactivé. Contactez un administrateur." });
    }
    return res.status(200).json({ success: true, user: publicUser(user), token: createToken(user) });
  } catch (error) {
    console.error("Erreur connexion:", error);
    return res.status(500).json({ success: false, message: "Impossible de se connecter." });
  }
};

const me = async (req, res) => {
  const user = await UserModel.findById(req.auth.userId);
  if (!user || !user.active) return res.status(401).json({ success: false, message: "Session non valide." });
  return res.json({ success: true, user: publicUser(user) });
};

module.exports = { register, login, me };
