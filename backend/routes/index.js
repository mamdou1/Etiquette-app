const express = require("express");
const agenceRoutes = require("./agenceRoutes");
const archiveRoutes = require("./archiveRoutes");
const uploadRoutes = require("./upload");
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const typeDocumentRoutes = require("./typeDocumentRoutes");  // ✅ NOUVEAU
const metaFieldRoutes = require("./metaFieldRoutes");        // ✅ NOUVEAU
const { requireAuth } = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", requireAuth, requireAdmin, userRoutes);
router.use("/agences", requireAuth, agenceRoutes);
router.use("/archives", requireAuth, archiveRoutes);
router.use("/upload", requireAuth, uploadRoutes);
router.use("/types-document", requireAuth, typeDocumentRoutes);  // ✅ NOUVEAU
router.use("/", requireAuth, metaFieldRoutes);                  // ✅ NOUVEAU

module.exports = router;