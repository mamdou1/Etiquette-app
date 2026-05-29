const express = require("express");
const router = express.Router();
const uploadController = require("../controllers/uploadController");
const { upload } = require("../services/multerService");

// POST /api/upload — reçoit le fichier Excel et retourne un JSON propre
router.post("/upload", upload.single("file"), uploadController.handleUpload);

module.exports = router;
