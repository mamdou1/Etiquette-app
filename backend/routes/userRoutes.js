const express = require("express");
const { getUsers, createUser, updateUser, setUserStatus } = require("../controllers/userController");

const router = express.Router();
router.get("/", getUsers);
router.post("/", createUser);
router.put("/:id", updateUser);
router.patch("/:id/status", setUserStatus);

module.exports = router;
