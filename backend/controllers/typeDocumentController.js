const { TypeDocumentModel } = require('../models');

// ─── GET /api/types-document ──────────────────────────────────
const getAll = async (req, res) => {
  try {
    const { active, agence_id } = req.query;
    
    let types;
    if (agence_id) {
      types = await TypeDocumentModel.findByAgence(
        parseInt(agence_id), 
        active !== undefined ? active === 'true' : true
      );
    } else {
      types = await TypeDocumentModel.findAll(active !== undefined ? active === 'true' : true);
    }

    res.status(200).json({
      success: true,
      count: types.length,
      data: types,
    });
  } catch (error) {
    console.error('❌ getAll types error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des types',
    });
  }
};

// ─── GET /api/types-document/:id ──────────────────────────────
const getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'ID invalide' });
    }

    const type = await TypeDocumentModel.findById(id);
    if (!type) {
      return res.status(404).json({ success: false, message: 'Type non trouvé' });
    }

    res.status(200).json({
      success: true,
      data: type,
    });
  } catch (error) {
    console.error('❌ getById error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération',
    });
  }
};

// ─── POST /api/types-document ─────────────────────────────────
const create = async (req, res) => {
  try {
    const { nom, code, description } = req.body;

    if (!nom || !nom.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le nom du type est obligatoire',
      });
    }

    const existing = await TypeDocumentModel.findByNom(nom.trim());
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Un type avec ce nom existe déjà',
      });
    }

    const type = await TypeDocumentModel.create({
      nom: nom.trim(),
      code: code ? code.trim() : nom.trim().toUpperCase(),
      description: description ? description.trim() : null,
    });

    res.status(201).json({
      success: true,
      message: 'Type créé avec succès',
      data: type,
    });
  } catch (error) {
    console.error('❌ create error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la création',
    });
  }
};

// ─── POST /api/types-document/:id/assign ──────────────────────
const assignToAgences = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'ID invalide' });
    }

    const { agence_ids = [] } = req.body;

    const type = await TypeDocumentModel.findById(id);
    if (!type) {
      return res.status(404).json({ success: false, message: 'Type non trouvé' });
    }

    const updated = await TypeDocumentModel.assignToAgences(id, agence_ids);

    res.status(200).json({
      success: true,
      message: `Type affecté à ${agence_ids.length} agence(s)`,
      data: updated,
    });
  } catch (error) {
    console.error('❌ assignToAgences error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de l\'affectation',
    });
  }
};

// ─── PUT /api/types-document/:id ──────────────────────────────
const update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'ID invalide' });
    }

    const { nom, code, description, active } = req.body;

    const type = await TypeDocumentModel.findById(id);
    if (!type) {
      return res.status(404).json({ success: false, message: 'Type non trouvé' });
    }

    if (nom && nom.trim() !== type.nom) {
      const existing = await TypeDocumentModel.findByNom(nom.trim());
      if (existing && existing.id !== id) {
        return res.status(409).json({
          success: false,
          message: 'Un autre type utilise déjà ce nom',
        });
      }
    }

    const updateData = {};
    if (nom !== undefined) updateData.nom = nom.trim();
    if (code !== undefined) updateData.code = code.trim() || updateData.nom || type.nom;
    if (description !== undefined) updateData.description = description.trim() || null;
    if (active !== undefined) updateData.active = active === true || active === 'true';

    const updated = await TypeDocumentModel.update(id, updateData);

    res.status(200).json({
      success: true,
      message: 'Type mis à jour avec succès',
      data: updated,
    });
  } catch (error) {
    console.error('❌ update error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la mise à jour',
    });
  }
};

// ─── DELETE /api/types-document/:id ───────────────────────────
const remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'ID invalide' });
    }

    const type = await TypeDocumentModel.findById(id);
    if (!type) {
      return res.status(404).json({ success: false, message: 'Type non trouvé' });
    }

    const deleted = await TypeDocumentModel.softDelete(id);
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la désactivation',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Type désactivé avec succès',
    });
  } catch (error) {
    console.error('❌ delete error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la suppression',
    });
  }
};

// ─── DELETE /api/types-document/:id/permanent ─────────────────
const removePermanent = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'ID invalide' });
    }

    const type = await TypeDocumentModel.findById(id);
    if (!type) {
      return res.status(404).json({ success: false, message: 'Type non trouvé' });
    }

    const deleted = await TypeDocumentModel.deletePermanent(id);
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression définitive',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Type supprimé définitivement',
    });
  } catch (error) {
    console.error('❌ deletePermanent error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la suppression définitive',
    });
  }
};

module.exports = {
  getAll,
  getById,
  create,
  assignToAgences,
  update,
  remove,
  removePermanent,
};