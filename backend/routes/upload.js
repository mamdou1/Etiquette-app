const express = require("express");
const { handleUpload } = require("../controllers/uploadController");
const { upload } = require("../services/multerService");

const router = express.Router();

router.post("/", upload.single("file"), handleUpload);

module.exports = router;