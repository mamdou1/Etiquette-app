const { MetaFieldModel } = require('../models');
const { TypeDocumentModel } = require('../models');

// ─── GET /api/types-document/:typeId/meta-fields ──────────────
// Récupérer tous les champs d'un type
const getByType = async (req, res) => {
  try {
    const typeId = parseInt(req.params.typeId);
    if (isNaN(typeId)) {
      return res.status(400).json({ success: false, message: 'ID de type invalide' });
    }

    const type = await TypeDocumentModel.findById(typeId);
    if (!type) {
      return res.status(404).json({ success: false, message: 'Type non trouvé' });
    }

    const fields = await MetaFieldModel.findByType(typeId);

    res.status(200).json({
      success: true,
      count: fields.length,
      data: fields,
    });
  } catch (error) {
    console.error('❌ getByType metaFields error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des champs',
    });
  }
};

// ─── GET /api/meta-fields/:id ──────────────────────────────────
// Récupérer un champ par son ID
const getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'ID invalide' });
    }

    const field = await MetaFieldModel.findById(id);
    if (!field) {
      return res.status(404).json({ success: false, message: 'Champ non trouvé' });
    }

    res.status(200).json({
      success: true,
      data: field,
    });
  } catch (error) {
    console.error('❌ getById metaField error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération',
    });
  }
};

// ─── POST /api/types-document/:typeId/meta-fields ─────────────
// Créer un champ de métadonnée pour un type
const create = async (req, res) => {
  try {
    const typeId = parseInt(req.params.typeId);
    if (isNaN(typeId)) {
      return res.status(400).json({ success: false, message: 'ID de type invalide' });
    }

    const type = await TypeDocumentModel.findById(typeId);
    if (!type) {
      return res.status(404).json({ success: false, message: 'Type non trouvé' });
    }

    const { name, label, field_type, required, visible, options, position, placeholder, description, default_value } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le nom du champ est obligatoire',
      });
    }

    if (!label || !label.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le label du champ est obligatoire',
      });
    }

    const field = await MetaFieldModel.create({
      type_document_id: typeId,
      name: name.trim(),
      label: label.trim(),
      field_type: field_type || 'TEXT',
      required: required !== undefined ? required : false,
      visible: visible !== undefined ? visible : true,
      options: options || null,
      position: position || undefined,
      placeholder: placeholder || null,
      description: description || null,
      default_value: default_value || null,
    });

    res.status(201).json({
      success: true,
      message: 'Champ créé avec succès',
      data: field,
    });
  } catch (error) {
    console.error('❌ create metaField error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la création du champ',
    });
  }
};

// ─── PUT /api/meta-fields/:id ──────────────────────────────────
// Mettre à jour un champ
const update = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'ID invalide' });
    }

    const field = await MetaFieldModel.findById(id);
    if (!field) {
      return res.status(404).json({ success: false, message: 'Champ non trouvé' });
    }

    const { name, label, field_type, required, visible, options, position, placeholder, description, default_value } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (label !== undefined) updateData.label = label.trim();
    if (field_type !== undefined) updateData.field_type = field_type;
    if (required !== undefined) updateData.required = required;
    if (visible !== undefined) updateData.visible = visible;
    if (options !== undefined) updateData.options = options;
    if (position !== undefined) updateData.position = position;
    if (placeholder !== undefined) updateData.placeholder = placeholder;
    if (description !== undefined) updateData.description = description;
    if (default_value !== undefined) updateData.default_value = default_value;

    const updated = await MetaFieldModel.update(id, updateData);

    res.status(200).json({
      success: true,
      message: 'Champ mis à jour avec succès',
      data: updated,
    });
  } catch (error) {
    console.error('❌ update metaField error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la mise à jour',
    });
  }
};

// ─── DELETE /api/meta-fields/:id ──────────────────────────────
// Supprimer un champ (soft delete)
const remove = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'ID invalide' });
    }

    const field = await MetaFieldModel.findById(id);
    if (!field) {
      return res.status(404).json({ success: false, message: 'Champ non trouvé' });
    }

    const deleted = await MetaFieldModel.softDelete(id);
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Champ supprimé avec succès',
    });
  } catch (error) {
    console.error('❌ delete metaField error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la suppression',
    });
  }
};

// ─── DELETE /api/meta-fields/:id/permanent ────────────────────
const removePermanent = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ success: false, message: 'ID invalide' });
    }

    const field = await MetaFieldModel.findById(id);
    if (!field) {
      return res.status(404).json({ success: false, message: 'Champ non trouvé' });
    }

    const deleted = await MetaFieldModel.deletePermanent(id);
    if (!deleted) {
      return res.status(500).json({
        success: false,
        message: 'Erreur lors de la suppression définitive',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Champ supprimé définitivement',
    });
  } catch (error) {
    console.error('❌ deletePermanent metaField error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la suppression définitive',
    });
  }
};

module.exports = {
  getByType,
  getById,
  create,
  update,
  remove,
  removePermanent,
};