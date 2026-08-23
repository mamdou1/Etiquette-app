const { AgenceModel, BoiteModel, ArchiveModel, TypeDocumentModel } = require("../models");
const { pool } = require("../config/database");

const FIELD_ALIASES = {
  box: ["n de la boite", "numero de boite", "numero boite", "numero box", "box", "boite", "boxnumber"],
  date: ["date de production", "date production"],
  type: ["type de document", "type document"],
  caissiers: ["nom des caissiers", "caissiers", "caissier"],
  agence: ["nom de l agence", "nom agence", "agence"],
  annee: ["annee", "annees"],
  observation: ["observation", "observations"],
};

function normalizeHeader(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getRecordValue(record, aliases) {
  for (const [key, value] of Object.entries(record)) {
    const normalizedKey = normalizeHeader(key);
    if (aliases.includes(normalizedKey) && String(value ?? "").trim()) {
      return String(value).trim();
    }
  }
  return "";
}

function getBoxNumber(record) {
  const exactMatch = getRecordValue(record, FIELD_ALIASES.box);
  if (exactMatch) return exactMatch;

  for (const [key, value] of Object.entries(record)) {
    const normalizedKey = normalizeHeader(key);
    if ((normalizedKey.includes("boite") || normalizedKey.includes("box")) && String(value ?? "").trim()) {
      return String(value).trim();
    }
  }

  return "";
}

function mergeArchivesByBox(archives) {
  const grouped = new Map();
  for (const archive of archives) {
    if (!grouped.has(archive.numero_boite)) grouped.set(archive.numero_boite, []);
    grouped.get(archive.numero_boite).push(archive);
  }

  return Array.from(grouped.values()).map((entries) => {
    const merged = { ...entries[0] };
    
    // Fusionner les champs texte avec séparateur
    const fieldsToMerge = ["caissiers", "type_document", "annee", "observation"];
    for (const field of fieldsToMerge) {
      const separator = field === "observation" ? " | " : ", ";
      const values = [...new Set(entries.map((entry) => entry[field]).filter(Boolean))];
      merged[field] = values.length > 0 ? values.join(separator) : "";
    }

    // Fusionner les données supplémentaires (JSON)
    if (entries.some(e => e.donnees_supplementaires)) {
      const mergedData = {};
      for (const entry of entries) {
        if (entry.donnees_supplementaires) {
          Object.assign(mergedData, entry.donnees_supplementaires);
        }
      }
      merged.donnees_supplementaires = mergedData;
    }

    return merged;
  });
}

const enrichirEtStocker = async (records) => {
  console.log(`📥 enrichirEtStocker: ${records.length} lignes reçues`);

  // ─── 1. Caches et statistiques ──────────────────────────────
  const agencyCache = new Map();
  const typeCache = new Map();
  const agenceTrouvees = new Set();
  const nouvellesAgences = new Set();
  const typesTrouves = new Set();
  const nouveauxTypes = new Set();
  const relationsCreees = [];
  const enriched = [];
  const archivesToSave = [];
  const allFields = new Set();
  let doublonsIgnores = 0;

  // ─── 2. Détecter tous les champs du fichier ──────────────────
  if (records.length > 0) {
    Object.keys(records[0]).forEach(key => allFields.add(key));
  }

  // ─── 3. Traiter chaque ligne ────────────────────────────────
  for (const record of records) {
    const boxNumber = getBoxNumber(record);
    if (!boxNumber) {
      console.warn("⚠️ Ligne ignorée : numéro de boîte introuvable");
      continue;
    }

    // ─── 3a. Gérer l'agence ──────────────────────────────────
    const agenceNom = getRecordValue(record, FIELD_ALIASES.agence) || "Sans agence";
    let agence = agencyCache.get(agenceNom);
    if (!agence) {
      const existing = await AgenceModel.findByNom(agenceNom);
      if (existing) {
        agence = existing;
        agenceTrouvees.add(agenceNom);
      } else {
        const code = agenceNom.substring(0, 4).toUpperCase();
        agence = await AgenceModel.findOrCreate(agenceNom, code);
        nouvellesAgences.add(agenceNom);
        console.log(`✅ Agence créée: ${agenceNom} (${code})`);
      }
      agencyCache.set(agenceNom, agence);
    }

    // ─── 3b. Gérer le type de document ──────────────────────
    const typeNom = getRecordValue(record, FIELD_ALIASES.type) || "Non défini";
    let typeId = typeCache.get(typeNom);
    if (typeId === undefined) {
      const existing = await TypeDocumentModel.findByNom(typeNom);
      if (existing) {
        typeId = existing.id;
        typesTrouves.add(typeNom);
      } else {
        const code = typeNom.substring(0, 3).toUpperCase();
        const newType = await TypeDocumentModel.create({
          nom: typeNom,
          code: code,
          description: typeNom,
          active: true
        });
        typeId = newType.id;
        nouveauxTypes.add(typeNom);
        console.log(`✅ Type créé: ${typeNom} (${code})`);
      }
      typeCache.set(typeNom, typeId);
    }

    // ─── 3c. Créer la relation agence ↔ type ──────────────
    const [existingRelation] = await pool.execute(
      'SELECT * FROM agence_type_documents WHERE agence_id = ? AND type_document_id = ?',
      [agence.id, typeId]
    );

    if (existingRelation.length === 0) {
      await pool.execute(
        'INSERT IGNORE INTO agence_type_documents (agence_id, type_document_id) VALUES (?, ?)',
        [agence.id, typeId]
      );
      relationsCreees.push({ agence: agenceNom, type: typeNom });
      console.log(`🔗 Relation créée: ${agenceNom} ↔ ${typeNom}`);
    }

    // ─── 3d. Extraire les données supplémentaires ──────────
    const extraData = {};
    const knownFields = [
      ...Object.values(FIELD_ALIASES).flat(),
      "numero_boite", "boxNumber", "box"
    ];
    
    for (const [key, value] of Object.entries(record)) {
      const normalizedKey = normalizeHeader(key);
      const isKnown = knownFields.some(alias => 
        normalizedKey.includes(alias) || alias.includes(normalizedKey)
      );
      
      if (!isKnown && value && String(value).trim()) {
        extraData[key] = String(value).trim();
      }
    }

    // ─── 3e. Construire l'archive ────────────────────────────
    const archive = {
      numero_boite: boxNumber.substring(0, 50),
      agence_id: agence.id,
      agence_nom: agenceNom.substring(0, 100),
      date_production: getRecordValue(record, FIELD_ALIASES.date).substring(0, 20) || null,
      type_document: typeNom.substring(0, 100),
      type_document_id: typeId,
      caissiers: getRecordValue(record, FIELD_ALIASES.caissiers).substring(0, 255) || "",
      annee: getRecordValue(record, FIELD_ALIASES.annee).substring(0, 10) || "",
      observation: getRecordValue(record, FIELD_ALIASES.observation).substring(0, 255) || "",
      source: "upload",
      donnees_supplementaires: Object.keys(extraData).length > 0 ? extraData : null
    };

    // ─── 3f. Sauvegarder dans boites (si nouvelle) ──────────
    const existingBox = await BoiteModel.findByNumero(archive.numero_boite);
    if (!existingBox) {
      await BoiteModel.create({
        numero: archive.numero_boite,
        agence_id: archive.agence_id,
        date_production: archive.date_production,
        type_document: archive.type_document,
        caissiers: archive.caissiers,
        annee: archive.annee,
        observation: archive.observation,
      });
    }

    archivesToSave.push(archive);
    enriched.push({ 
      ...record, 
      Source: "Fichier uploadé",
      agence_id: agence.id,
      type_document_id: typeId
    });
  }

  // ─── 4. Regrouper par boîte (fusion) ───────────────────────
  const uniqueArchives = mergeArchivesByBox(archivesToSave);
  console.log(`📦 ${archivesToSave.length} lignes → ${uniqueArchives.length} boîte(s) unique(s)`);

  // ─── 5. Sauvegarder dans archives (INSERT IGNORE) ──────────
  const savedCount = await ArchiveModel.saveMany(uniqueArchives);
  
  // Calculer les doublons ignorés
  doublonsIgnores = Math.max(0, uniqueArchives.length - savedCount);

  // ─── 6. Retourner les statistiques ──────────────────────────
  return {
    enriched,
    savedCount,
    doublonsIgnores,
    agenceTrouvees: [...agenceTrouvees],
    nouvellesAgences: [...nouvellesAgences],
    typesTrouves: [...typesTrouves],
    nouveauxTypes: [...nouveauxTypes],
    relationsCreees: relationsCreees,
    totalLignes: records.length,
    totalBoitesUniques: uniqueArchives.length,
    champsDetectes: [...allFields],
    isReimport: doublonsIgnores > 0
  };
};

module.exports = { enrichirEtStocker };