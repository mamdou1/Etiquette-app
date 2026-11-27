const jwt = require("jsonwebtoken");
const { UserModel } = require("../models");

const JWT_SECRET = process.env.JWT_SECRET || "change-this-development-jwt-secret";

const requireAuth = async (req, res, next) => {
  const token = req.headers.authorization?.startsWith("Bearer ")
    ? req.headers.authorization.slice(7)
    : null;
  if (!token) return res.status(401).json({ success: false, message: "Authentification requise." });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await UserModel.findById(payload.sub);
    if (!user || !user.active) {
      return res.status(401).json({ success: false, message: "Votre compte est désactivé ou introuvable." });
    }
    // Le rôle en base est utilisé afin qu'un changement d'administrateur soit
    // immédiat, même si l'ancien jeton JWT est encore valable.
    req.auth = { userId: user.id, email: user.email, role: user.role };
    return next();
  } catch {
    return res.status(401).json({ success: false, message: "Votre session a expiré. Connectez-vous à nouveau." });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.auth?.role !== "admin") {
    return res.status(403).json({ success: false, message: "Accès réservé aux administrateurs." });
  }
  return next();
};

module.exports = { requireAuth, auth: requireAuth, requireAdmin };
