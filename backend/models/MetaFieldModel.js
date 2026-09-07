const { pool } = require("../config/database");

const MetaFieldModel = {
  findByType: async (typeId) => {
    const [rows] = await pool.execute(
      "SELECT * FROM meta_fields WHERE type_document_id = ? AND deleted_at IS NULL ORDER BY position ASC",
      [typeId],
    );
    return rows;
  },

  findById: async (id) => {
    const [rows] = await pool.execute(
      "SELECT * FROM meta_fields WHERE id = ? AND deleted_at IS NULL",
      [id],
    );
    return rows[0] || null;
  },

  // ─── Trouver un MetaField par nom ──────────────────────────────
  findByName: async (typeDocumentId, name) => {
    const [rows] = await pool.execute(
      "SELECT * FROM meta_fields WHERE type_document_id = ? AND name = ? AND deleted_at IS NULL",
      [typeDocumentId, name],
    );
    return rows[0] || null;
  },

  create: async (data) => {
    const {
      type_document_id,
      name,
      label,
      field_type,
      required,
      visible,
      options,
      position,
      placeholder,
      description,
      default_value,
    } = data;

    let pos = position;
    if (pos === undefined) {
      const [maxPos] = await pool.execute(
        "SELECT MAX(position) as max FROM meta_fields WHERE type_document_id = ?",
        [type_document_id],
      );
      pos = (maxPos[0].max || 0) + 1;
    }

    const [result] = await pool.execute(
      `INSERT INTO meta_fields (type_document_id, name, label, field_type, required, visible, options, position, placeholder, description, default_value)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        type_document_id,
        name.trim(),
        label.trim(),
        field_type || "TEXT",
        required ? 1 : 0,
        visible !== undefined ? visible : 1,
        options ? JSON.stringify(options) : null,
        pos,
        placeholder || null,
        description || null,
        default_value || null,
      ],
    );

    return MetaFieldModel.findById(result.insertId);
  },

  update: async (id, data) => {
    const fields = [];
    const values = [];

    if (data.name !== undefined) {
      fields.push("name = ?");
      values.push(data.name.trim());
    }
    if (data.label !== undefined) {
      fields.push("label = ?");
      values.push(data.label.trim());
    }
    if (data.field_type !== undefined) {
      fields.push("field_type = ?");
      values.push(data.field_type);
    }
    if (data.required !== undefined) {
      fields.push("required = ?");
      values.push(data.required ? 1 : 0);
    }
    if (data.visible !== undefined) {
      fields.push("visible = ?");
      values.push(data.visible ? 1 : 0);
    }
    if (data.options !== undefined) {
      fields.push("options = ?");
      values.push(data.options ? JSON.stringify(data.options) : null);
    }
    if (data.position !== undefined) {
      fields.push("position = ?");
      values.push(data.position);
    }
    if (data.placeholder !== undefined) {
      fields.push("placeholder = ?");
      values.push(data.placeholder || null);
    }
    if (data.description !== undefined) {
      fields.push("description = ?");
      values.push(data.description || null);
    }
    if (data.default_value !== undefined) {
      fields.push("default_value = ?");
      values.push(data.default_value || null);
    }

    if (fields.length === 0) return null;

    values.push(id);
    await pool.execute(
      `UPDATE meta_fields SET ${fields.join(", ")} WHERE id = ?`,
      values,
    );

    return MetaFieldModel.findById(id);
  },

  softDelete: async (id) => {
    const [result] = await pool.execute(
      "UPDATE meta_fields SET deleted_at = NOW() WHERE id = ?",
      [id],
    );
    return result.affectedRows > 0;
  },

  deletePermanent: async (id) => {
    const [result] = await pool.execute(
      "DELETE FROM meta_fields WHERE id = ?",
      [id],
    );
    return result.affectedRows > 0;
  },
};

module.exports = MetaFieldModel;
