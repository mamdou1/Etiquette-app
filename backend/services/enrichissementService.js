const { AgenceModel, BoiteModel, ArchiveModel } = require("../models");

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
    for (const field of ["caissiers", "type_document", "annee", "observation"]) {
      const separator = field === "observation" ? " | " : ", ";
      merged[field] = [...new Set(entries.map((entry) => entry[field]).filter(Boolean))].join(separator);
    }
    return merged;
  });
}

const enrichirEtStocker = async (records) => {
  console.log(`📥 enrichirEtStocker: ${records.length} lignes reçues`);

  const agencyCache = new Map();
  const agenceTrouvees = new Set();
  const nouvellesAgences = new Set();
  const enriched = [];
  const archivesToSave = [];

  for (const record of records) {
    const boxNumber = getBoxNumber(record);
    if (!boxNumber) {
      console.warn("⚠️ Ligne ignorée : numéro de boîte introuvable", record);
      continue;
    }

    const agenceNom = getRecordValue(record, FIELD_ALIASES.agence) || "Sans agence";
    let agence = agencyCache.get(agenceNom);
    if (!agence) {
      const existing = await AgenceModel.findByNom(agenceNom);
      agence = existing || await AgenceModel.findOrCreate(agenceNom);
      agencyCache.set(agenceNom, agence);
      (existing ? agenceTrouvees : nouvellesAgences).add(agenceNom);
    }

    const archive = {
      numero_boite: boxNumber.substring(0, 50),
      agence_id: agence.id,
      agence_nom: agenceNom.substring(0, 100),
      date_production: getRecordValue(record, FIELD_ALIASES.date).substring(0, 20),
      type_document: getRecordValue(record, FIELD_ALIASES.type).substring(0, 100),
      caissiers: getRecordValue(record, FIELD_ALIASES.caissiers).substring(0, 255),
      annee: getRecordValue(record, FIELD_ALIASES.annee).substring(0, 10),
      observation: getRecordValue(record, FIELD_ALIASES.observation).substring(0, 255),
      source: "upload",
    };

    // Le premier import est conservé comme référence, y compris dans boites.
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
    enriched.push({ ...record, Source: "Fichier uploadé" });
  }

  const uniqueArchives = mergeArchivesByBox(archivesToSave);
  console.log(`📦 ${records.length} lignes → ${uniqueArchives.length} boîte(s) unique(s)`);
  const savedCount = await ArchiveModel.saveMany(uniqueArchives);

  return {
    enriched,
    savedCount,
    agenceTrouvees: [...agenceTrouvees],
    nouvellesAgences: [...nouvellesAgences],
  };
};

module.exports = { enrichirEtStocker };
