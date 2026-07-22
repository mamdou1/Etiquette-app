const express = require("express");
const agenceRoutes = require("./agenceRoutes");
const archiveRoutes = require("./archiveRoutes");
const uploadRoutes = require("./upload");

const router = express.Router();

router.use("/agences", agenceRoutes);
router.use("/archives", archiveRoutes);
router.use("/upload", uploadRoutes);

module.exports = router;