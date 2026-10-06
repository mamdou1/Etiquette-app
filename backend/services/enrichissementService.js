const {
  AgenceModel,
  TypeDocumentModel,
  MetaFieldModel,
  MetaFieldValueModel,
} = require("../models");
const { pool } = require("../config/database");

// ─── ALIASES POUR LA DÉTECTION ──────────────────────────────────
const FIELD_ALIASES = {
  box: [
    "n de la boite",
    "numero de boite",
    "numero boite",
    "numero box",
    "box",
    "boite",
    "boîte",
    "boxnumber",
    "n°",
    "nº",
    "reference",
    "référence",
    "ref",
    "id",
    "identifiant",
    "no",
    "numéro",
    "numero",
    "n° de boite",
    "n° boite",
  ],
  // ✅ ANNÉE : uniquement "année", jamais "date"
  annee: [
    "annee de production",
    "année de production",
    "annee production",
    "année production",
    "annee",
    "année",
    "year",
    "annees",
    "années",
  ],
  agence: [
    "nom de l agence",
    "nom agence",
    "agence",
    "direction",
    "entite",
    "nom de l'agence",
    "nom d'agence",
    "service",
    "departement",
    "entité",
    "direction générale",
    "dg",
  ],
  type: [
    "type de document",
    "type document",
    "type",
    "typ",
    "document type",
    "nature",
    "nature du document",
    "categorie",
    "catégorie",
  ],
  // ✅ DATE : uniquement "date", jamais "année"
  date: [
    "date de production",
    "date production",
    "date du document",
    "date d'édition",
    "production date",
    "date",
    "jour",
  ],
  caissiers: [
    "nom des caissiers",
    "caissiers",
    "caissier",
    "preparateur",
    "prep",
    "agent",
    "responsable",
    "nom du caissier",
    "caissière",
  ],
  observation: [
    "observation",
    "observations",
    "remarque",
    "note",
    "obs",
    "commentaire",
    "commentaires",
    "info",
    "information",
  ],
  rayon: [
    "rayon",
    "rayons",
    "ray",
    "section",
    "allee",
    "allée",
    "emplacement",
    "salle",
  ],
  travers: [
    "travers",
    "traver",
    "trv",
    "niveau",
    "tablette",
    "traversin",
    "colonne",
    "rangee",
    "rangée",
    "rang",
  ],
};

// ─── FONCTIONS DE NORMALISATION ────────────────────────────────

function normalizeText(value) {
  if (!value) return "";
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ✅ Génère toutes les variantes d'un texte (universel)
function generateAllVariants(text) {
  if (!text) return [];
  const variants = new Set();
  const normalized = normalizeText(text);
  const original = String(text).trim();

  variants.add(original);
  variants.add(normalized);

  if (normalized.length > 0) {
    variants.add(normalized.charAt(0).toUpperCase() + normalized.slice(1));
  }

  variants.add(normalized.toUpperCase());

  const words = normalized.split(" ").filter((w) => w.length > 0);
  if (words.length > 0) {
    const initials = words.map((w) => w[0]).join("");
    variants.add(initials);
    variants.add(initials.toUpperCase());
    variants.add(initials.toLowerCase());

    if (words.length === 1 && words[0].length > 2) {
      variants.add(words[0].substring(0, 2));
      variants.add(words[0].substring(0, 3));
      variants.add(words[0].substring(0, 2).toUpperCase());
      variants.add(words[0].substring(0, 3).toUpperCase());
    }
  }

  if (normalized.includes(" ")) {
    const noSpace = normalized.replace(/\s+/g, "");
    variants.add(noSpace);
    variants.add(noSpace.toUpperCase());
    variants.add(noSpace.charAt(0).toUpperCase() + noSpace.slice(1));
  }

  if (normalized.includes(" ")) {
    const withDash = normalized.replace(/\s+/g, "-");
    variants.add(withDash);
    variants.add(withDash.toUpperCase());
    variants.add(withDash.charAt(0).toUpperCase() + withDash.slice(1));

    const withDot = normalized.replace(/\s+/g, ".");
    variants.add(withDot);
    variants.add(withDot.toUpperCase());
  }

  if (words.length > 1) {
    const withDots = words.map((w) => w[0]).join(".");
    variants.add(withDots);
    variants.add(withDots.toUpperCase());
    variants.add(withDots + ".");
    variants.add(withDots.toUpperCase() + ".");
  }

  if (normalized.endsWith("s")) {
    const singular = normalized.slice(0, -1);
    variants.add(singular);
    variants.add(singular.charAt(0).toUpperCase() + singular.slice(1));
  } else {
    const plural = normalized + "s";
    variants.add(plural);
    variants.add(plural.charAt(0).toUpperCase() + plural.slice(1));
  }

  const stopWords = [
    "de",
    "la",
    "le",
    "les",
    "des",
    "du",
    "et",
    "ou",
    "pour",
    "par",
  ];
  const withoutStopWords = words
    .filter((w) => !stopWords.includes(w))
    .join(" ");
  if (withoutStopWords && withoutStopWords !== normalized) {
    variants.add(withoutStopWords);
    variants.add(withoutStopWords.toUpperCase());
  }

  return Array.from(variants);
}

// ✅ Comparaison floue universelle
function fuzzyMatch(text1, text2) {
  if (!text1 || !text2) return false;

  const norm1 = normalizeText(text1);
  const norm2 = normalizeText(text2);

  if (norm1 === norm2) return true;

  const variants1 = generateAllVariants(text1);
  const variants2 = generateAllVariants(text2);

  for (const v1 of variants1) {
    const nv1 = normalizeText(v1);
    for (const v2 of variants2) {
      const nv2 = normalizeText(v2);
      if (nv1 === nv2) return true;
    }
  }

  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

  const words1 = norm1.split(" ");
  const words2 = norm2.split(" ");
  const commonWords = words1.filter((w) => words2.includes(w) && w.length > 1);
  if (
    commonWords.length > 0 &&
    commonWords.length >= Math.min(words1.length, words2.length) * 0.4
  ) {
    return true;
  }

  return false;
}

// ✅ Mapping universel
function mapTypeToExisting(typeFromFile, existingTypes) {
  if (!typeFromFile || !existingTypes || existingTypes.length === 0) {
    return null;
  }

  const fileVariants = generateAllVariants(typeFromFile);

  let bestMatch = null;
  let bestScore = 0;

  for (const existingType of existingTypes) {
    const existingVariants = generateAllVariants(existingType);

    for (const fileVariant of fileVariants) {
      const nfv = normalizeText(fileVariant);
      for (const existingVariant of existingVariants) {
        const nev = normalizeText(existingVariant);
        if (nfv === nev) {
          return existingType;
        }
      }
    }

    if (fuzzyMatch(typeFromFile, existingType)) {
      const score = calculateSimilarity(typeFromFile, existingType);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = existingType;
      }
    }
  }

  if (bestMatch && bestScore > 0.5) {
    return bestMatch;
  }

  return null;
}

// ✅ Calcul de similarité entre deux textes
function calculateSimilarity(text1, text2) {
  const norm1 = normalizeText(text1);
  const norm2 = normalizeText(text2);

  if (norm1 === norm2) return 1;

  const words1 = norm1.split(" ");
  const words2 = norm2.split(" ");

  const commonWords = words1.filter((w) => words2.includes(w) && w.length > 1);
  const totalWords = Math.max(words1.length, words2.length);

  if (totalWords === 0) return 0;

  return commonWords.length / totalWords;
}

function detectFieldType(value) {
  const str = String(value).trim();
  if (/^\d+$/.test(str)) return "number";
  if (/^\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}$/.test(str)) return "date";
  if (/^\d+[\.,]\d+$/.test(str)) return "number";
  return "text";
}

// ─── DÉTECTION DES COLONNES ─────────────────────────────────────
function detectColumn(headers, aliases) {
  for (const header of headers) {
    const normalized = normalizeText(header);
    for (const alias of aliases) {
      const normalizedAlias = normalizeText(alias);
      if (
        normalized.includes(normalizedAlias) ||
        normalizedAlias.includes(normalized)
      ) {
        return header;
      }
    }
  }
  return null;
}

function detectBoxColumn(headers) {
  const explicitBoxColumn = headers.find((header) => {
    const key = normalizeText(header).replace(/[^a-z0-9]/g, "");
    return /^(?:(?:n|no|num|numero)(?:de)?(?:la)?boite|boite|boxnumber|box|numbox|nobox|numerobox|(?:n|no|num|numero)?chrono)$/.test(
      key,
    );
  });
  if (explicitBoxColumn) return explicitBoxColumn;
  let boxColumn = detectColumn(headers, FIELD_ALIASES.box);
  if (boxColumn) return boxColumn;

  const keywords = [
    "boite",
    "boîte",
    "box",
    "n°",
    "numero",
    "réf",
    "ref",
    "id",
  ];
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

// ✅ Détection STRICTE de l'année : "annee" obligatoire, "date" INTERDIT
function detectAnneeColumn(headers) {
  // 1. Priorité : "annee" + "production" et PAS "date"
  const exactMatch = headers.find((h) => {
    const n = normalizeText(h);
    return (
      n.includes("anne") && n.includes("production") && !n.includes("date")
    );
  });
  if (exactMatch) {
    console.log(`✅ Colonne année (production) détectée: ${exactMatch}`);
    return exactMatch;
  }

  // 2. Fallback : "annee" sans "date" ni "destruction"
  const anneeOnly = headers.find((h) => {
    const n = normalizeText(h);
    return n.includes("anne") && !n.includes("date") && !n.includes("destruct");
  });
  if (anneeOnly) {
    console.log(`✅ Colonne année détectée: ${anneeOnly}`);
    return anneeOnly;
  }

  return null;
}

function detectAgenceColumn(headers) {
  return detectColumn(headers, FIELD_ALIASES.agence);
}

function detectTypeColumn(headers) {
  return detectColumn(headers, FIELD_ALIASES.type);
}

// ✅ Détection STRICTE de la date : "date" obligatoire, "annee" INTERDIT
function detectDateColumn(headers) {
  // 1. Priorité : "date" + "production" et PAS "anne"
  const exactMatch = headers.find((h) => {
    const n = normalizeText(h);
    return (
      n.includes("date") && n.includes("production") && !n.includes("anne")
    );
  });
  if (exactMatch) {
    console.log(`✅ Colonne date (production) détectée: ${exactMatch}`);
    return exactMatch;
  }

  // 2. Fallback : "date" sans "anne" ni "destruction"
  const dateOnly = headers.find((h) => {
    const n = normalizeText(h);
    return n.includes("date") && !n.includes("anne") && !n.includes("destruct");
  });
  if (dateOnly) {
    console.log(`✅ Colonne date détectée: ${dateOnly}`);
    return dateOnly;
  }

  return null;
}

function detectCaissiersColumn(headers) {
  return detectColumn(headers, FIELD_ALIASES.caissiers);
}

function detectObservationColumn(headers) {
  return detectColumn(headers, FIELD_ALIASES.observation);
}

function detectRayonColumn(headers) {
  return detectColumn(headers, FIELD_ALIASES.rayon);
}

function detectTraversColumn(headers) {
  return detectColumn(headers, FIELD_ALIASES.travers);
}

// ─── MATCHING DES MÉTADONNÉES ──────────────────────────────────
function findMatchingMetaField(columnName, metaFields) {
  const normalizedColumn = normalizeText(columnName);
  let bestMatch = null;
  let bestScore = 0;

  for (const mf of metaFields) {
    const normalizedMF = normalizeText(mf.name);
    if (
      normalizedColumn.includes(normalizedMF) ||
      normalizedMF.includes(normalizedColumn)
    ) {
      const score = Math.max(
        normalizedColumn.length / (normalizedMF.length + 1),
        normalizedMF.length / (normalizedColumn.length + 1),
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
function groupByBox(records, boxColumn, anneeColumn) {
  const groups = new Map();
  for (const record of records) {
    const numero_boite = String(record[boxColumn] ?? '').trim();
    if (!numero_boite) throw new Error('Une ligne ne contient pas de numéro de boîte. Corrigez le fichier avant de l’importer.');
    if (!groups.has(numero_boite)) groups.set(numero_boite, { numero_boite, rows: [], years: new Set() });
    const group = groups.get(numero_boite);
    const row = Object.fromEntries(Object.entries(record).filter(([key]) => !key.startsWith('_')));
    const year = String(record[anneeColumn] || record._sheetYear || '').trim();
    if (!anneeColumn && year) row['Année'] = year;
    group.rows.push(row);
    if (year) group.years.add(year);
  }
  return [...groups.values()].map(({ years, ...group }) => ({
    ...group, annee: years.size === 1 ? [...years][0] : '',
  }));
}

const enrichirEtStocker = async (records, agenceId, typeDocumentId) => {
  console.log(`📥 enrichirEtStocker: ${records.length} lignes reçues`);
  console.log(`📌 Agence: ${agenceId}, Type: ${typeDocumentId}`);

  if (!records || records.length === 0) {
    return { enriched: [], savedCount: 0, message: "Aucune donnée" };
  }

  // ─── 1. Vérifier l'agence et le type ──────────────────────────
  const agence = await AgenceModel.findById(agenceId);
  if (!agence) {
    throw new Error("Agence non trouvée");
  }

  const typeDoc = await TypeDocumentModel.findById(typeDocumentId);
  if (!typeDoc) {
    throw new Error("Type de document non trouvé");
  }

  // ─── 2. Détecter les colonnes ─────────────────────────────────
  const headers = [...new Set(records.flatMap(record => Object.keys(record)))].filter(key => !key.startsWith('_'));
  console.log("📋 Colonnes détectées:", headers);

  const boxColumn = detectBoxColumn(headers);
  const anneeColumn = detectAnneeColumn(headers);
  const agenceColumn = detectAgenceColumn(headers);
  const typeColumn = detectTypeColumn(headers);
  const rayonColumn = detectRayonColumn(headers);
  const traversColumn = detectTraversColumn(headers);

  console.log(`🔍 Box: ${boxColumn}`);
  console.log(`🔍 Année: ${anneeColumn}`);
  console.log(`🔍 Agence: ${agenceColumn}`);
  console.log(`🔍 Type: ${typeColumn}`);
  console.log(`🔍 Rayon: ${rayonColumn}`);
  console.log(`🔍 Travers: ${traversColumn}`);

  if (!boxColumn) {
    throw new Error('Impossible de détecter la colonne "N° Boîte"');
  }

  // ─── ✅ 2.bis NETTOYAGE STRICT DE L'ANNÉE ──────────────────────
  // L'année de production ne doit JAMAIS être une date complète.
  // On extrait uniquement les 4 chiffres de l'année.
  for (const record of records) {
    if (!anneeColumn) continue;

    const val = record[anneeColumn];
    if (val === undefined || val === null || val === "") continue;

    let anneeStr = "";

    // Cas 1 : objet Date (bug Excel) → extraire l'année
    if (val instanceof Date) {
      const y = val.getFullYear();
      // 1905 = 2015 jours après 1900 → la valeur originale était 2015
      if (y === 1905) {
        anneeStr = "2015";
      } else if (y < 2000) {
        anneeStr = "";
      } else {
        anneeStr = String(y);
      }
      console.log(
        `🔧 Année Date corrigée: ${val.toISOString()} → "${anneeStr}"`,
      );
    }
    // Cas 2 : nombre → convertir en string
    else if (typeof val === "number") {
      if (val >= 1900 && val <= 2100) {
        anneeStr = String(val);
      } else {
        anneeStr = "";
      }
    }
    // Cas 3 : string → garder uniquement les 4 chiffres
    else if (typeof val === "string") {
      const match = val.match(/\b(19|20)\d{2}\b/);
      if (match) {
        anneeStr = match[0];
      } else if (/^\d{4}$/.test(val.trim())) {
        anneeStr = val.trim();
      } else {
        anneeStr = val.trim();
      }
    }

    record[anneeColumn] = anneeStr;
  }

  // ─── ✅ 3. VALIDATION AVEC MAPPING UNIVERSEL ──────────────────

  if (agenceColumn) {
    const agenceValues = records.map((r) =>
      String(r[agenceColumn] || "").trim(),
    );
    const uniqueAgences = [...new Set(agenceValues)].filter(Boolean);

    if (uniqueAgences.length > 0) {
      const hasMatch = uniqueAgences.some((fa) => fuzzyMatch(fa, agence.nom));

      if (!hasMatch) {
        throw new Error(
          `❌ L'agence dans le fichier (${uniqueAgences.join(", ")}) ne correspond pas à l'agence sélectionnée (${agence.nom})`,
        );
      }
      console.log(`✅ Validation agence OK: ${agence.nom}`);
    }
  }

  if (typeColumn) {
    const typeValues = records.map((r) => String(r[typeColumn] || "").trim());
    const uniqueTypes = [...new Set(typeValues)].filter(Boolean);

    if (uniqueTypes.length > 0) {
      const allTypes = await TypeDocumentModel.findAll();
      const existingTypeNames = allTypes.map((t) => t.nom);

      let matchedType = null;
      let matchedTypeId = null;
      let matchedFrom = null;

      for (const fileType of uniqueTypes) {
        const mapped = mapTypeToExisting(fileType, existingTypeNames);
        if (mapped) {
          const foundType = allTypes.find((t) => t.nom === mapped);
          if (foundType) {
            matchedType = mapped;
            matchedTypeId = foundType.id;
            matchedFrom = fileType;
            console.log(
              `✅ Type "${fileType}" mappé vers "${mapped}" (ID: ${foundType.id})`,
            );
            break;
          }
        }
      }

      if (matchedType && matchedTypeId) {
        if (matchedTypeId === typeDocumentId) {
          console.log(
            `✅ Le type sélectionné correspond au type mappé: ${matchedType}`,
          );
        } else {
          console.log(
            `⚠️ Type mappé "${matchedType}" (ID: ${matchedTypeId}) différent du type sélectionné "${typeDoc.nom}" (ID: ${typeDocumentId})`,
          );
          console.log(
            `🔄 Utilisation automatique du type "${matchedType}" (ID: ${matchedTypeId})`,
          );
          typeDocumentId = matchedTypeId;
        }
      } else {
        const directMatch = uniqueTypes.some((ft) =>
          fuzzyMatch(ft, typeDoc.nom),
        );

        if (!directMatch) {
          const variants = generateAllVariants(typeDoc.nom);
          const variantsStr = variants.slice(0, 10).join(", ");

          const similarTypes = existingTypeNames.filter((t) =>
            fuzzyMatch(t, uniqueTypes[0]),
          );

          let suggestion = "";
          if (similarTypes.length > 0 && similarTypes[0] !== typeDoc.nom) {
            suggestion = `\n💡 Le type "${uniqueTypes[0]}" correspond à "${similarTypes[0]}". Veuillez sélectionner ce type.`;
          } else if (uniqueTypes.length > 1) {
            const uniqueTypeList = uniqueTypes.join(", ");
            const allExistingTypes = existingTypeNames.join(", ");
            suggestion = `\n💡 Types trouvés: ${uniqueTypeList}\n💡 Types disponibles: ${allExistingTypes}`;
          } else {
            suggestion = `\n💡 Variantes acceptées: ${variantsStr}`;
          }

          throw new Error(
            `Le type dans le fichier (${uniqueTypes.join(", ")}) ne correspond pas au type sélectionné (${typeDoc.nom}).${suggestion}`,
          );
        }
      }
    }
  }

  // ─── 4. Récupérer les MetaFields du type ──────────────────────
  let metaFields = await MetaFieldModel.findByType(typeDocumentId);
  console.log(`📋 ${metaFields.length} MetaFields existants`);

  // ─── 5. Créer les MetaFields manquants ────────────────────────
  const mandatoryColumns = [boxColumn, anneeColumn];

  const columnsToCreate = headers.filter((h) => {
    const normalized = normalizeText(h);
    const isMandatory = mandatoryColumns.some((k) => {
      const normalizedK = normalizeText(k);
      return normalized === normalizedK;
    });
    return !isMandatory && !h.startsWith('_');
  });

  console.log(`📋 Colonnes à créer comme MetaFields: ${columnsToCreate}`);

  let createdCount = 0;
  for (const col of columnsToCreate) {
    const existing = metaFields.find(
      (mf) => normalizeText(mf.name) === normalizeText(col),
    );
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
  const enriched = await require('./labelService').importLabels(agenceId, typeDocumentId, grouped, boxColumn);
  const savedCount = grouped.length * metaFields.length;

  console.log(`✅ ${savedCount} valeurs sauvegardées`);

  return {
    enriched,
    boxField: boxColumn,
    savedCount,
    totalLignes: records.length,
    totalBoites: grouped.length,
    metaFieldsCrees: createdCount,
    metaFields: metaFields,
    agenceTrouvees: [agence.nom],
    typesTrouves: [typeDoc.nom],
    champsDetectes: headers,
    fields: metaFields.map((mf) => mf.name),
    fieldLabels: metaFields.reduce((acc, mf) => {
      acc[mf.name] = mf.label || mf.name;
      return acc;
    }, {}),
    message: `${grouped.length} boîtes sauvegardées avec ${metaFields.length} champs chacun`,
  };
};

module.exports = { enrichirEtStocker };
