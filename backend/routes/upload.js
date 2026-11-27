const express = require("express");
const { handleUpload } = require("../controllers/uploadController");
const { upload } = require("../services/multerService");
const { beginUploadPerf, markUploadReceived } = require("../utils/performance");

const router = express.Router();

router.post("/", beginUploadPerf, upload.single("file"), markUploadReceived, handleUpload);

module.exports = router;
