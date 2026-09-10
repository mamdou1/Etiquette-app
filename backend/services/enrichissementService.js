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
  
  // 1. Original
  variants.add(original);
  
  // 2. Normalisé (sans accents, minuscules)
  variants.add(normalized);
  
  // 3. Première lettre majuscule
  if (normalized.length > 0) {
    variants.add(normalized.charAt(0).toUpperCase() + normalized.slice(1));
  }
  
  // 4. Majuscules
  variants.add(normalized.toUpperCase());
  
  // 5. Initiales de chaque mot (ex: "Pièces de caisse" → "PDC")
  const words = normalized.split(' ').filter(w => w.length > 0);
  if (words.length > 0) {
    const initials = words.map(w => w[0]).join('');
    variants.add(initials);
    variants.add(initials.toUpperCase());
    variants.add(initials.toLowerCase());
    
    // Si un seul mot, prendre les 2-3 premières lettres
    if (words.length === 1 && words[0].length > 2) {
      variants.add(words[0].substring(0, 2));
      variants.add(words[0].substring(0, 3));
      variants.add(words[0].substring(0, 2).toUpperCase());
      variants.add(words[0].substring(0, 3).toUpperCase());
    }
  }
  
  // 6. Sans espaces
  if (normalized.includes(' ')) {
    const noSpace = normalized.replace(/\s+/g, '');
    variants.add(noSpace);
    variants.add(noSpace.toUpperCase());
    variants.add(noSpace.charAt(0).toUpperCase() + noSpace.slice(1));
  }
  
  // 7. Avec séparateurs
  if (normalized.includes(' ')) {
    const withDash = normalized.replace(/\s+/g, '-');
    variants.add(withDash);
    variants.add(withDash.toUpperCase());
    variants.add(withDash.charAt(0).toUpperCase() + withDash.slice(1));
    
    const withDot = normalized.replace(/\s+/g, '.');
    variants.add(withDot);
    variants.add(withDot.toUpperCase());
  }
  
  // 8. Avec points entre les lettres (ex: P.C.)
  if (words.length > 1) {
    const withDots = words.map(w => w[0]).join('.');
    variants.add(withDots);
    variants.add(withDots.toUpperCase());
    variants.add(withDots + '.');
    variants.add(withDots.toUpperCase() + '.');
  }
  
  // 9. Singulier/Pluriel (généralisation)
  // Remplacer 's' final pour le singulier, ajouter 's' pour le pluriel
  if (normalized.endsWith('s')) {
    const singular = normalized.slice(0, -1);
    variants.add(singular);
    variants.add(singular.charAt(0).toUpperCase() + singular.slice(1));
  } else {
    const plural = normalized + 's';
    variants.add(plural);
    variants.add(plural.charAt(0).toUpperCase() + plural.slice(1));
  }
  
  // 10. Supprimer les mots courts (de, la, le, les, des, etc.)
  const stopWords = ['de', 'la', 'le', 'les', 'des', 'du', 'et', 'ou', 'pour', 'par'];
  const withoutStopWords = words.filter(w => !stopWords.includes(w)).join(' ');
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
  
  // Comparaison exacte
  if (norm1 === norm2) return true;
  
  // Générer toutes les variantes
  const variants1 = generateAllVariants(text1);
  const variants2 = generateAllVariants(text2);
  
  // Vérifier si une variante correspond
  for (const v1 of variants1) {
    const nv1 = normalizeText(v1);
    for (const v2 of variants2) {
      const nv2 = normalizeText(v2);
      if (nv1 === nv2) return true;
    }
  }
  
  // Vérifier si l'un est contenu dans l'autre
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  
  // Vérifier les mots clés communs (au moins 50%)
  const words1 = norm1.split(' ');
  const words2 = norm2.split(' ');
  const commonWords = words1.filter(w => words2.includes(w) && w.length > 1);
  if (commonWords.length > 0 && commonWords.length >= Math.min(words1.length, words2.length) * 0.4) {
    return true;
  }
  
  return false;
}

// ✅ Mapping universel
function mapTypeToExisting(typeFromFile, existingTypes) {
  if (!typeFromFile || !existingTypes || existingTypes.length === 0) {
    return null;
  }
  
  // Générer toutes les variantes du type du fichier
  const fileVariants = generateAllVariants(typeFromFile);
  
  let bestMatch = null;
  let bestScore = 0;
  
  for (const existingType of existingTypes) {
    const existingVariants = generateAllVariants(existingType);
    
    // Vérifier les correspondances exactes
    for (const fileVariant of fileVariants) {
      const nfv = normalizeText(fileVariant);
      for (const existingVariant of existingVariants) {
        const nev = normalizeText(existingVariant);
        if (nfv === nev) {
          // Correspondance exacte → score maximum
          return existingType;
        }
      }
    }
    
    // Comparaison floue
    if (fuzzyMatch(typeFromFile, existingType)) {
      // Calculer un score de similarité
      const score = calculateSimilarity(typeFromFile, existingType);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = existingType;
      }
    }
  }
  
  // Si une correspondance floue est trouvée avec un bon score
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
  
  const words1 = norm1.split(' ');
  const words2 = norm2.split(' ');
  
  const commonWords = words1.filter(w => words2.includes(w) && w.length > 1);
  const totalWords = Math.max(words1.length, words2.length);
  
  if (totalWords === 0) return 0;
  
  return commonWords.length / totalWords;
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

  // ─── ✅ 3. VALIDATION AVEC MAPPING UNIVERSEL ──────────────────
  
  // Vérifier l'agence
  if (agenceColumn) {
    const agenceValues = records.map(r => String(r[agenceColumn] || "").trim());
    const uniqueAgences = [...new Set(agenceValues)].filter(Boolean);
    
    if (uniqueAgences.length > 0) {
      const hasMatch = uniqueAgences.some(fa => 
        fuzzyMatch(fa, agence.nom)
      );
      
      if (!hasMatch) {
        throw new Error(
          `❌ L'agence dans le fichier (${uniqueAgences.join(', ')}) ne correspond pas à l'agence sélectionnée (${agence.nom})`
        );
      }
      console.log(`✅ Validation agence OK: ${agence.nom}`);
    }
  }

  // ✅ Vérification du type avec mapping universel
  if (typeColumn) {
    const typeValues = records.map(r => String(r[typeColumn] || "").trim());
    const uniqueTypes = [...new Set(typeValues)].filter(Boolean);
    
    if (uniqueTypes.length > 0) {
      // Récupérer tous les types existants dans la base de données
      const allTypes = await TypeDocumentModel.findAll();
      const existingTypeNames = allTypes.map(t => t.nom);
      
      let matchedType = null;
      let matchedTypeId = null;
      let matchedFrom = null;
      
      // Essayer de mapper chaque type du fichier
      for (const fileType of uniqueTypes) {
        const mapped = mapTypeToExisting(fileType, existingTypeNames);
        if (mapped) {
          const foundType = allTypes.find(t => t.nom === mapped);
          if (foundType) {
            matchedType = mapped;
            matchedTypeId = foundType.id;
            matchedFrom = fileType;
            console.log(`✅ Type "${fileType}" mappé vers "${mapped}" (ID: ${foundType.id})`);
            break;
          }
        }
      }
      
      // ✅ Si un type a été mappé automatiquement
      if (matchedType && matchedTypeId) {
        // Vérifier si le type mappé correspond au type sélectionné
        if (matchedTypeId === typeDocumentId) {
          console.log(`✅ Le type sélectionné correspond au type mappé: ${matchedType}`);
        } else {
          // Le type mappé est différent de celui sélectionné
          // On peut soit l'utiliser automatiquement, soit demander à l'utilisateur
          console.log(`⚠️ Type mappé "${matchedType}" (ID: ${matchedTypeId}) différent du type sélectionné "${typeDoc.nom}" (ID: ${typeDocumentId})`);
          
          // Option 1: Utiliser automatiquement le type mappé
          console.log(`🔄 Utilisation automatique du type "${matchedType}" (ID: ${matchedTypeId})`);
          typeDocumentId = matchedTypeId;
          
          // Option 2: Demander confirmation (à implémenter si besoin)
          // throw new Error(`Le type "${matchedFrom}" correspond à "${matchedType}" mais vous avez sélectionné "${typeDoc.nom}". Veuillez sélectionner "${matchedType}".`);
        }
      } else {
        // Aucun mapping trouvé, vérifier si le type sélectionné correspond directement
        const directMatch = uniqueTypes.some(ft => 
          fuzzyMatch(ft, typeDoc.nom)
        );
        
        if (!directMatch) {
          // Générer un message d'erreur avec suggestions
          const variants = generateAllVariants(typeDoc.nom);
          const variantsStr = variants.slice(0, 10).join(', ');
          
          // Trouver les types similaires
          const similarTypes = existingTypeNames.filter(t => 
            fuzzyMatch(t, uniqueTypes[0])
          );
          
          let suggestion = '';
          if (similarTypes.length > 0 && similarTypes[0] !== typeDoc.nom) {
            suggestion = `\n💡 Le type "${uniqueTypes[0]}" correspond à "${similarTypes[0]}". Veuillez sélectionner ce type.`;
          } else if (uniqueTypes.length > 1) {
            // Si plusieurs types différents dans le fichier
            const uniqueTypeList = uniqueTypes.join(', ');
            const allExistingTypes = existingTypeNames.join(', ');
            suggestion = `\n💡 Types trouvés: ${uniqueTypeList}\n💡 Types disponibles: ${allExistingTypes}`;
          } else {
            suggestion = `\n💡 Variantes acceptées: ${variantsStr}`;
          }
          
          throw new Error(
            `Le type dans le fichier (${uniqueTypes.join(', ')}) ne correspond pas au type sélectionné (${typeDoc.nom}).${suggestion}`
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
  const valuesToSave = grouped.flatMap((group) =>
    metaFields.map((mf) => ({
      agence_id: agenceId,
      type_document_id: typeDocumentId,
      meta_field_id: mf.id,
      numero_boite: group.numero_boite,
      annee: group.annee,
      value: group.metaValues[mf.name] || "",
    })),
  );

  // Écrire plusieurs valeurs en parallèle, par petits lots. Les écritures
  // restaient séquentielles (une attente réseau par cellule), ce qui rendait
  // les imports de plusieurs années inutilement lents.
  const batchSize = 20;
  for (let start = 0; start < valuesToSave.length; start += batchSize) {
    const batch = valuesToSave.slice(start, start + batchSize);
    await Promise.all(batch.map((value) => MetaFieldValueModel.upsert(value)));
  }

  const savedCount = valuesToSave.length;
  const enriched = [];

  for (const group of grouped) {
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
    fields: metaFields.map(mf => mf.name),
    fieldLabels: metaFields.reduce((acc, mf) => {
      acc[mf.name] = mf.label || mf.name;
      return acc;
    }, {}),
    message: `${grouped.length} boîtes sauvegardées avec ${metaFields.length} champs chacun`,
  };
};

module.exports = { enrichirEtStocker };
