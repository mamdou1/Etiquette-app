const express = require("express");
const agenceRoutes = require("./agenceRoutes");
const archiveRoutes = require("./archiveRoutes");
const uploadRoutes = require("./upload");
const authRoutes = require("./authRoutes");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/authMiddleware");
const userRoutes = require("./userRoutes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", requireAuth, requireAdmin, userRoutes);
router.use("/agences", requireAuth, agenceRoutes);
router.use("/archives", requireAuth, archiveRoutes);
router.use("/upload", requireAuth, uploadRoutes);

module.exports = router;
