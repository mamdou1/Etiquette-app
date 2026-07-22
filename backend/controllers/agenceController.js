const { AgenceModel } = require("../models");

const getAllAgences = async (req, res) => {
  try {
    const { active } = req.query;
    const agences = await AgenceModel.findAll(
      active !== undefined ? active === "true" : undefined
    );
    res.status(200).json({
      success: true,
      count: agences.length,
      data: agences,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la récupération des agences",
    });
  }
};

const createAgence = async (req, res) => {
  try {
    const { nom, code } = req.body;
    if (!nom || !code) {
      return res.status(400).json({
        success: false,
        message: "Le nom et le code sont obligatoires",
      });
    }

    const existing = await AgenceModel.findByNom(nom);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Une agence avec ce nom existe déjà",
      });
    }

    const agence = await AgenceModel.findOrCreate(nom);
    res.status(201).json({
      success: true,
      message: "Agence créée avec succès",
      data: agence,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Erreur lors de la création",
    });
  }
};

module.exports = { getAllAgences, createAgence };