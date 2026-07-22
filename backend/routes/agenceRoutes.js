const express = require("express");
const { getAllAgences, createAgence } = require("../controllers/agenceController");

const router = express.Router();

router.get("/", getAllAgences);
router.post("/", createAgence);

module.exports = router;