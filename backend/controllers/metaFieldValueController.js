const { MetaFieldValueModel } = require('../models');

// ─── GET /api/meta-field-values/archive/:archiveId ──────────
// Récupérer toutes les valeurs d'une archive
const getByArchive = async (req, res) => {
  try {
    const archiveId = parseInt(req.params.archiveId);
    if (isNaN(archiveId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID d\'archive invalide' 
      });
    }

    const values = await MetaFieldValueModel.findByArchive(archiveId);

    res.status(200).json({
      success: true,
      count: values.length,
      data: values,
    });
  } catch (error) {
    console.error('❌ getByArchive error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des valeurs',
    });
  }
};

// ─── GET /api/meta-field-values/archives ──────────────────────
// Récupérer les valeurs pour plusieurs archives
const getByArchives = async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) {
      return res.status(400).json({
        success: false,
        message: 'Paramètre ids requis (ex: ids=1,2,3)',
      });
    }

    const archiveIds = ids.split(',').map(id => parseInt(id.trim()));
    if (archiveIds.some(isNaN)) {
      return res.status(400).json({
        success: false,
        message: 'IDs invalides',
      });
    }

    const values = await MetaFieldValueModel.findByArchives(archiveIds);

    // Grouper par archive_id
    const grouped = {};
    values.forEach(v => {
      if (!grouped[v.archive_id]) grouped[v.archive_id] = [];
      grouped[v.archive_id].push(v);
    });

    res.status(200).json({
      success: true,
      data: grouped,
    });
  } catch (error) {
    console.error('❌ getByArchives error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération des valeurs',
    });
  }
};

// ─── GET /api/meta-field-values/:id ───────────────────────────
// Récupérer une valeur par son ID
const getById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID invalide' 
      });
    }

    const [rows] = await pool.execute(
      'SELECT * FROM meta_field_values WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Valeur non trouvée',
      });
    }

    res.status(200).json({
      success: true,
      data: rows[0],
    });
  } catch (error) {
    console.error('❌ getById error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la récupération',
    });
  }
};

// ─── POST /api/meta-field-values ─────────────────────────────
// Créer ou mettre à jour une valeur
const upsert = async (req, res) => {
  try {
    const { archive_id, meta_field_id, value } = req.body;

    if (!archive_id || !meta_field_id) {
      return res.status(400).json({
        success: false,
        message: 'archive_id et meta_field_id sont obligatoires',
      });
    }

    const result = await MetaFieldValueModel.upsert(
      parseInt(archive_id),
      parseInt(meta_field_id),
      value
    );

    res.status(200).json({
      success: true,
      data: result,
      message: 'Valeur sauvegardée avec succès',
    });
  } catch (error) {
    console.error('❌ upsert metaFieldValue error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la sauvegarde',
    });
  }
};

// ─── POST /api/meta-field-values/batch ────────────────────────
// Créer ou mettre à jour plusieurs valeurs en une fois
const batchUpsert = async (req, res) => {
  try {
    const { archive_id, values } = req.body;

    if (!archive_id) {
      return res.status(400).json({
        success: false,
        message: 'archive_id est obligatoire',
      });
    }

    if (!values || !Array.isArray(values) || values.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'values doit être un tableau non vide',
      });
    }

    const results = [];
    for (const item of values) {
      if (!item.meta_field_id) continue;
      const result = await MetaFieldValueModel.upsert(
        parseInt(archive_id),
        parseInt(item.meta_field_id),
        item.value
      );
      results.push(result);
    }

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
      message: `${results.length} valeur(s) sauvegardée(s) avec succès`,
    });
  } catch (error) {
    console.error('❌ batchUpsert error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la sauvegarde en batch',
    });
  }
};

// ─── DELETE /api/meta-field-values ────────────────────────────
// Supprimer une valeur
const remove = async (req, res) => {
  try {
    const { archive_id, meta_field_id } = req.body;

    if (!archive_id || !meta_field_id) {
      return res.status(400).json({
        success: false,
        message: 'archive_id et meta_field_id sont obligatoires',
      });
    }

    const deleted = await MetaFieldValueModel.delete(
      parseInt(archive_id),
      parseInt(meta_field_id)
    );

    res.status(200).json({
      success: true,
      message: deleted ? 'Valeur supprimée avec succès' : 'Aucune valeur trouvée',
    });
  } catch (error) {
    console.error('❌ delete metaFieldValue error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la suppression',
    });
  }
};

// ─── DELETE /api/meta-field-values/archive/:archiveId ────────
// Supprimer toutes les valeurs d'une archive
const deleteByArchive = async (req, res) => {
  try {
    const archiveId = parseInt(req.params.archiveId);
    if (isNaN(archiveId)) {
      return res.status(400).json({
        success: false,
        message: 'ID d\'archive invalide',
      });
    }

    const deleted = await MetaFieldValueModel.deleteByArchive(archiveId);

    res.status(200).json({
      success: true,
      message: `${deleted} valeur(s) supprimée(s)`,
    });
  } catch (error) {
    console.error('❌ deleteByArchive error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la suppression',
    });
  }
};

const batchCreate = async (req, res) => {
  try {
    const typeId = parseInt(req.params.typeId);
    if (isNaN(typeId)) {
      return res.status(400).json({ success: false, message: 'ID de type invalide' });
    }

    const type = await TypeDocumentModel.findById(typeId);
    if (!type) {
      return res.status(404).json({ success: false, message: 'Type non trouvé' });
    }

    const { fields = [] } = req.body;

    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'fields doit être un tableau non vide',
      });
    }

    const createdFields = [];
    let position = fields.length > 0 ? fields[0].position || 1 : 1;

    for (const fieldData of fields) {
      if (!fieldData.name || !fieldData.label) {
        continue; // Ignorer les champs invalides
      }

      const field = await MetaFieldModel.create({
        type_document_id: typeId,
        name: fieldData.name.trim(),
        label: fieldData.label.trim(),
        field_type: fieldData.field_type || 'text',
        required: fieldData.required || false,
        visible: fieldData.visible !== undefined ? fieldData.visible : true,
        position: fieldData.position || position,
        placeholder: fieldData.placeholder || null,
        description: fieldData.description || null,
        default_value: fieldData.default_value || null,
      });

      createdFields.push(field);
      position++;
    }

    res.status(201).json({
      success: true,
      count: createdFields.length,
      data: createdFields,
      message: `${createdFields.length} champ(s) créé(s) avec succès`,
    });
  } catch (error) {
    console.error('❌ batchCreate metaField error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Erreur lors de la création en batch',
    });
  }
};

module.exports = {
  getByArchive,
  getByArchives,
  getById,
  batchCreate,
  upsert,
  batchUpsert,
  remove,
  deleteByArchive,
};