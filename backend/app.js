const express = require("express");
const cors = require("cors");
const uploadRoutes = require("./routes/upload");

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

// Routes
app.use("/api", uploadRoutes);

// Health check
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "Serveur Étiquettes opérationnel" });
});

app.listen(PORT, () => {
  console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
});
