const express = require("express");
const agenceRoutes = require("./agenceRoutes");
const archiveRoutes = require("./archiveRoutes");
const uploadRoutes = require("./upload");
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const typeDocumentRoutes = require("./typeDocumentRoutes");
const metaFieldRoutes = require("./metaFieldRoutes");
const metaFieldValueRoutes = require("./metaFieldValueRoutes");
//const printRoutes = require("./printRoutes");
const searchRoutes = require("./searchRoutes"); // ✅ NOUVEAU
const { requireAuth } = require("../middleware/authMiddleware");
const { requireAdmin } = require("../middleware/authMiddleware");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", requireAuth, requireAdmin, userRoutes);
router.use("/agences", requireAuth, agenceRoutes);
router.use("/archives", requireAuth, archiveRoutes);
router.use("/upload", requireAuth, uploadRoutes);
router.use("/types-document", requireAuth, typeDocumentRoutes);
router.use("/", requireAuth, metaFieldRoutes);
router.use("/meta-field-values", requireAuth, metaFieldValueRoutes);
//router.use("/print", requireAuth, printRoutes);
router.use("/search", requireAuth, searchRoutes); // ✅ NOUVEAU

module.exports = router;