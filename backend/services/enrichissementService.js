const { AgenceModel, TypeDocumentModel, MetaFieldModel, MetaFieldValueModel } = require("../models");
const { pool } = require("../config/database");

// ─── ALIASES POUR LA DÉTECTION ──────────────────────────────────
const FIELD_ALIASES = {
  box: [
    "n de la boite", "numero de boite", "numero boite", "numero box", 
    "box", "boite", "boîte", "boxnumber", "n°", "nº", 
    "reference", "référence", "ref", "id", "identifiant",
    "no", "numéro", "numero", "n° de boite", "n° boite"
  ],
  annee: [
    "annee", "année", "year", "année de production", "annees",
    "années", "year of production", "production year"
  ],
  agence: [
    "nom de l agence", "nom agence", "agence", "direction", "entite",
    "nom de l'agence", "nom d'agence", "service", "departement",
    "entité", "direction générale", "dg"
  ],
  type: [
    "type de document", "type document", "type", "typ", "document type",
    "nature", "nature du document", "categorie", "catégorie"
  ],
  date: [
    "date de production", "date production", "date", "jour",
    "date du document", "date d'édition", "production date"
  ],
  caissiers: [
    "nom des caissiers", "caissiers", "caissier", "preparateur", "prep",
    "agent", "responsable", "nom du caissier", "caissière"
  ],
  observation: [
    "observation", "observations", "remarque", "note", "obs",
    "commentaire", "commentaires", "info", "information"
  ],
};

// ─── NORMALISATION ──────────────────────────────────────────────
function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function detectFieldType(value) {
  const str = String(value).trim();
  if (/^\d+$/.test(str)) return 'number';
  if (/^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}$/.test(str)) return 'date';
  if (/^\d+[\.,]\d+$/.test(str)) return 'number';
  return 'text';
}

// ─── DÉTECTION DES COLONNES ─────────────────────────────────────
function detectColumn(headers, aliases) {
  for (const header of headers) {
    const normalized = normalizeText(header);
    for (const alias of aliases) {
      const normalizedAlias = normalizeText(alias);
      if (normalized.includes(normalizedAlias) || normalizedAlias.includes(normalized)) {
        return header;
      }
    }
  }
  return null;
}

function detectBoxColumn(headers) {
  let boxColumn = detectColumn(headers, FIELD_ALIASES.box);
  if (boxColumn) return boxColumn;

  const keywords = ["boite", "boîte", "box", "n°", "numero", "réf", "ref", "id"];
  let bestColumn = headers[0];
  let bestScore = 0;

  for (const header of headers) {
    const normalized = normalizeText(header);
    let score = 0;
    for (const keyword of keywords) {
      if (normalized.includes(keyword)) {
        score += 10;
      }
    }
    if (normalized.length < 15) {
      score += 3;
    }
    if (score > bestScore) {
      bestScore = score;
      bestColumn = header;
    }
  }
  return bestColumn;
}

function detectAnneeColumn(headers) {
  return detectColumn(headers, FIELD_ALIASES.annee);
}

function detectAgenceColumn(headers) {
  return detectColumn(headers, FIELD_ALIASES.agence);
}

function detectTypeColumn(headers) {
  return detectColumn(headers, FIELD_ALIASES.type);
}

function detectDateColumn(headers) {
  return detectColumn(headers, FIELD_ALIASES.date);
}

function detectCaissiersColumn(headers) {
  return detectColumn(headers, FIELD_ALIASES.caissiers);
}

function detectObservationColumn(headers) {
  return detectColumn(headers, FIELD_ALIASES.observation);
}

// ─── MATCHING DES MÉTADONNÉES ──────────────────────────────────
function findMatchingMetaField(columnName, metaFields) {
  const normalizedColumn = normalizeText(columnName);
  let bestMatch = null;
  let bestScore = 0;

  for (const mf of metaFields) {
    const normalizedMF = normalizeText(mf.name);
    if (normalizedColumn.includes(normalizedMF) || normalizedMF.includes(normalizedColumn)) {
      const score = Math.max(
        normalizedColumn.length / (normalizedMF.length + 1),
        normalizedMF.length / (normalizedColumn.length + 1)
      );
      if (score > bestScore) {
        bestScore = score;
        bestMatch = mf;
      }
    }
  }
  return bestMatch;
}

// ─── REGROUPEMENT PAR BOÎTE ─────────────────────────────────────
function groupByBox(records, boxColumn, anneeColumn, metaFields) {
  const groups = new Map();

  for (const record of records) {
    const boxNumber = String(record[boxColumn] || "").trim();
    if (!boxNumber) continue;

    const annee = anneeColumn ? String(record[anneeColumn] || "").trim() : "Sans année";

    const metaValues = {};
    const usedMetaFields = new Set();

    for (const mf of metaFields) {
      let value = record[mf.name] || record[mf.label] || "";
      if (value && String(value).trim()) {
        metaValues[mf.name] = String(value).trim();
        usedMetaFields.add(mf.id);
      }
    }

    for (const mf of metaFields) {
      if (usedMetaFields.has(mf.id)) continue;
      
      for (const [key, value] of Object.entries(record)) {
        if (normalizeText(key) === normalizeText(mf.name) || 
            normalizeText(key) === normalizeText(mf.label)) {
          if (value && String(value).trim()) {
            metaValues[mf.name] = String(value).trim();
            usedMetaFields.add(mf.id);
            break;
          }
        }
      }
    }

    for (const mf of metaFields) {
      if (usedMetaFields.has(mf.id)) continue;
      
      const match = findMatchingMetaField(mf.name, metaFields);
      if (match && !usedMetaFields.has(match.id)) {
        for (const [key, value] of Object.entries(record)) {
          if (normalizeText(key) === normalizeText(mf.name)) {
            if (value && String(value).trim()) {
              metaValues[mf.name] = String(value).trim();
              usedMetaFields.add(mf.id);
              break;
            }
          }
        }
      }
    }

    for (const mf of metaFields) {
      if (!metaValues[mf.name]) {
        metaValues[mf.name] = "";
      }
    }

    const key = `${boxNumber}|${annee}`;
    if (!groups.has(key)) {
      groups.set(key, {
        numero_boite: boxNumber,
        annee: annee,
        metaValues: metaValues,
        count: 0,
      });
    }
    groups.get(key).count++;
  }

  return Array.from(groups.values());
}

// ─── FONCTION PRINCIPALE ────────────────────────────────────────
const enrichirEtStocker = async (records, agenceId, typeDocumentId) => {
  console.log(`📥 enrichirEtStocker: ${records.length} lignes reçues`);
  console.log(`📌 Agence: ${agenceId}, Type: ${typeDocumentId}`);

  if (!records || records.length === 0) {
    return { enriched: [], savedCount: 0, message: 'Aucune donnée' };
  }

  // ─── 1. Vérifier l'agence et le type ──────────────────────────
  const agence = await AgenceModel.findById(agenceId);
  if (!agence) {
    throw new Error('Agence non trouvée');
  }

  const typeDoc = await TypeDocumentModel.findById(typeDocumentId);
  if (!typeDoc) {
    throw new Error('Type de document non trouvé');
  }

  // ─── 2. Détecter les colonnes ─────────────────────────────────
  const headers = Object.keys(records[0]);
  console.log('📋 Colonnes détectées:', headers);

  const boxColumn = detectBoxColumn(headers);
  const anneeColumn = detectAnneeColumn(headers);
  const agenceColumn = detectAgenceColumn(headers);
  const typeColumn = detectTypeColumn(headers);

  console.log(`🔍 Box: ${boxColumn}`);
  console.log(`🔍 Année: ${anneeColumn}`);
  console.log(`🔍 Agence: ${agenceColumn}`);
  console.log(`🔍 Type: ${typeColumn}`);

  if (!boxColumn) {
    throw new Error('Impossible de détecter la colonne "N° Boîte"');
  }

  // ─── ✅ 3. VALIDATION : Vérifier que les données correspondent ──
  // Vérifier l'agence
  if (agenceColumn) {
    const agenceValues = records.map(r => String(r[agenceColumn] || "").trim());
    const uniqueAgences = [...new Set(agenceValues)].filter(Boolean);
    
    if (uniqueAgences.length > 0) {
      const allMatchAgence = uniqueAgences.every(a => 
        normalizeText(a) === normalizeText(agence.nom)
      );
      
      if (!allMatchAgence) {
        throw new Error(
          `❌ L'agence dans le fichier (${uniqueAgences.join(', ')}) ne correspond pas à l'agence sélectionnée (${agence.nom})`
        );
      }
      console.log(`✅ Validation agence OK: ${agence.nom}`);
    }
  }

  // Vérifier le type
  if (typeColumn) {
    const typeValues = records.map(r => String(r[typeColumn] || "").trim());
    const uniqueTypes = [...new Set(typeValues)].filter(Boolean);
    
    if (uniqueTypes.length > 0) {
      const allMatchType = uniqueTypes.every(t => 
        normalizeText(t) === normalizeText(typeDoc.nom)
      );
      
      if (!allMatchType) {
        throw new Error(
          `❌ Le type dans le fichier (${uniqueTypes.join(', ')}) ne correspond pas au type sélectionné (${typeDoc.nom})`
        );
      }
      console.log(`✅ Validation type OK: ${typeDoc.nom}`);
    }
  }

  // ─── 4. Récupérer les MetaFields du type ──────────────────────
  let metaFields = await MetaFieldModel.findByType(typeDocumentId);
  console.log(`📋 ${metaFields.length} MetaFields existants`);

  // ─── 5. Créer les MetaFields manquants ────────────────────────
  const mandatoryColumns = [boxColumn, anneeColumn];
  
  const columnsToCreate = headers.filter(h => {
    const normalized = normalizeText(h);
    const isMandatory = mandatoryColumns.some(k => {
      const normalizedK = normalizeText(k);
      return normalized === normalizedK;
    });
    return !isMandatory;
  });

  console.log(`📋 Colonnes à créer comme MetaFields: ${columnsToCreate}`);

  let createdCount = 0;
  for (const col of columnsToCreate) {
    const existing = metaFields.find(mf => normalizeText(mf.name) === normalizeText(col));
    if (!existing) {
      const sampleValue = records[0][col] || "";
      const newField = await MetaFieldModel.create({
        type_document_id: typeDocumentId,
        name: col,
        label: col,
        field_type: detectFieldType(sampleValue),
        position: metaFields.length + createdCount + 1,
        visible: true,
        required: false,
      });
      metaFields.push(newField);
      createdCount++;
      console.log(`📝 Nouveau MetaField créé: ${col}`);
    }
  }

  if (createdCount > 0) {
    console.log(`✅ ${createdCount} nouveau(x) MetaField(s) créé(s)`);
  }

  // ─── 6. Regrouper par boîte ──────────────────────────────────
  const grouped = groupByBox(records, boxColumn, anneeColumn, metaFields);
  console.log(`📦 ${records.length} lignes → ${grouped.length} boîtes`);

  // ─── 7. Sauvegarder dans meta_field_values ──────────────────
  let savedCount = 0;
  const enriched = [];

  for (const group of grouped) {
    for (const mf of metaFields) {
      const value = group.metaValues[mf.name] || "";
      await MetaFieldValueModel.upsert({
        agence_id: agenceId,
        type_document_id: typeDocumentId,
        meta_field_id: mf.id,
        numero_boite: group.numero_boite,
        annee: group.annee,
        value: value,
      });
      savedCount++;
    }
    enriched.push({
      numero_boite: group.numero_boite,
      annee: group.annee,
      metaValues: group.metaValues,
      count: group.count,
    });
  }

  console.log(`✅ ${savedCount} valeurs sauvegardées`);

  return {
    enriched,
    savedCount,
    totalLignes: records.length,
    totalBoites: grouped.length,
    metaFieldsCrees: createdCount,
    metaFields: metaFields,
    agenceTrouvees: [agence.nom],
    typesTrouves: [typeDoc.nom],
    champsDetectes: headers,
    // ✅ AJOUT : Champs pour le frontend
    fields: metaFields.map(mf => mf.name),
    fieldLabels: metaFields.reduce((acc, mf) => {
      acc[mf.name] = mf.label || mf.name;
      return acc;
    }, {}),
    message: `${grouped.length} boîtes sauvegardées avec ${metaFields.length} champs chacun`,
  };
};

module.exports = { enrichirEtStocker };