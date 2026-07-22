const { AgenceModel, BoiteModel, ArchiveModel } = require("../models");

const enrichirEtStocker = async (records) => {
  const result = [];
  const agenceTrouvees = [];
  const nouvellesAgences = [];
  const archivesToSave = [];

  for (const record of records) {
    // ✅ Trouver l'agence UNIQUEMENT par le champ "Nom de l'Agence"
    const agenceNom = findAgenceField(record);
    
    if (agenceNom) {
      const agenceNomTronque = String(agenceNom).substring(0, 100);
      
      // Vérifier si c'est un nom de caissier (pour éviter les erreurs)
      if (isCaissierName(agenceNomTronque, record)) {
        // Si c'est un caissier, ne pas créer d'agence
        const boxNumber = getBoxNumber(record);
        result.push({ 
          ...record, 
          "Source": "Fichier uploadé (nom détecté comme caissier)" 
        });
        archivesToSave.push({
          numero_boite: String(boxNumber).substring(0, 50),
          agence_id: 0,
          agence_nom: "Sans agence",
          date_production: String(record["Date de Production"] || "").substring(0, 20),
          type_document: String(record["Type de Document"] || "").substring(0, 100),
          caissiers: String(record["Nom des caissiers"] || "").substring(0, 255),
          annee: String(record["Année"] || "").substring(0, 10),
          observation: String(record["Observation"] || "").substring(0, 255),
          source: "upload_sans_agence",
        });
        continue;
      }

      let agence = await AgenceModel.findOrCreate(agenceNomTronque);
      
      const isNew = agence.created_at && new Date(agence.created_at).getTime() > Date.now() - 5000;
      if (isNew) {
        nouvellesAgences.push(agenceNomTronque);
      } else {
        agenceTrouvees.push(agenceNomTronque);
      }

      const boites = await BoiteModel.findByAgenceNom(agenceNomTronque);
      
      if (boites.length > 0) {
        for (const boite of boites) {
          const ligne = {
            "N° de la Boite": boite.numero || "",
            "Date de Production": boite.date_production || "",
            "Type de Document": boite.type_document || "",
            "Nom des caissiers": boite.caissiers || "",
            "Nom de l'Agence": agenceNomTronque,
            "Année": boite.annee || "",
            "Observation": boite.observation || "",
            "Source": "Base de données",
          };
          result.push(ligne);
          
          archivesToSave.push({
            numero_boite: boite.numero || "",
            agence_id: agence.id,
            agence_nom: agenceNomTronque,
            date_production: boite.date_production || "",
            type_document: boite.type_document || "",
            caissiers: boite.caissiers || "",
            annee: boite.annee || "",
            observation: boite.observation || "",
            source: "base_donnees",
          });
        }
      } else {
        const boxNumber = getBoxNumber(record);
        
        const boiteData = {
          numero: String(boxNumber).substring(0, 50),
          agence_id: agence.id,
          date_production: String(record["Date de Production"] || "").substring(0, 20),
          type_document: String(record["Type de Document"] || "").substring(0, 100),
          caissiers: String(record["Nom des caissiers"] || "").substring(0, 255),
          annee: String(record["Année"] || "").substring(0, 10),
          observation: String(record["Observation"] || "").substring(0, 255),
        };
        await BoiteModel.upsert(boiteData);
        
        const ligne = { 
          ...record, 
          "Source": "Nouvelle agence créée" 
        };
        result.push(ligne);
        
        archivesToSave.push({
          numero_boite: String(boxNumber).substring(0, 50),
          agence_id: agence.id,
          agence_nom: agenceNomTronque,
          date_production: String(record["Date de Production"] || "").substring(0, 20),
          type_document: String(record["Type de Document"] || "").substring(0, 100),
          caissiers: String(record["Nom des caissiers"] || "").substring(0, 255),
          annee: String(record["Année"] || "").substring(0, 10),
          observation: String(record["Observation"] || "").substring(0, 255),
          source: "upload",
        });
      }
    } else {
      const boxNumber = getBoxNumber(record);
      result.push({ ...record, "Source": "Fichier uploadé (sans agence)" });
      archivesToSave.push({
        numero_boite: String(boxNumber).substring(0, 50),
        agence_id: 0,
        agence_nom: "Sans agence",
        date_production: String(record["Date de Production"] || "").substring(0, 20),
        type_document: String(record["Type de Document"] || "").substring(0, 100),
        caissiers: String(record["Nom des caissiers"] || "").substring(0, 255),
        annee: String(record["Année"] || "").substring(0, 10),
        observation: String(record["Observation"] || "").substring(0, 255),
        source: "upload_sans_agence",
      });
    }
  }

  const savedCount = await ArchiveModel.saveMany(archivesToSave);

  return {
    enriched: result,
    savedCount,
    agenceTrouvees,
    nouvellesAgences,
  };
};

// ─── HELPERS ───────────────────────────────────────────────────

/**
 * ✅ Trouver le champ "Agence" UNIQUEMENT
 * Ne cherche que les champs qui contiennent "Agence" ou "agence"
 */
function findAgenceField(record) {
  // ✅ Clés EXACTES pour l'agence
  const agenceKeys = [
    "Nom de l'Agence",
    "Nom de l' Agence", 
    "Agence",
    "agence",
    "NomAgence",
    "NOM_AGENCE",
    "nom_agence",
    "Nom Agence",
    "AGENCE",
    "Nom Agence",
  ];

  // ✅ Chercher d'abord dans les clés exactes
  for (const key of agenceKeys) {
    if (record[key] !== undefined && record[key] !== null) {
      const value = String(record[key]).trim();
      if (value && value.length > 0) {
        return value;
      }
    }
  }

  // ✅ Chercher dans les clés qui contiennent "agence" (mais pas "caissier")
  for (const key of Object.keys(record)) {
    const normalizedKey = key
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    
    // ✅ UNIQUEMENT si la clé contient "agence" et ne contient pas "caissier"
    if (normalizedKey.includes("agence") && !normalizedKey.includes("caissier")) {
      const value = String(record[key]).trim();
      if (value && value.length > 0) {
        return value;
      }
    }
  }

  return null;
}

/**
 * ✅ Vérifie si un nom est probablement un caissier
 */
function isCaissierName(name, record) {
  // Si le nom est déjà dans la liste des caissiers
  const caissiersField = record["Nom des caissiers"] || record["Caissiers"] || "";
  if (caissiersField) {
    const caissiersList = String(caissiersField).split(/[,;]/).map(c => c.trim().toLowerCase());
    const nameLower = name.toLowerCase();
    if (caissiersList.some(c => c.includes(nameLower) || nameLower.includes(c))) {
      return true;
    }
  }

  // Si le nom est court (moins de 3 caractères) ce n'est pas une agence
  if (name.length < 3) {
    return true;
  }

  // Liste des noms connus d'agences
  const knownAgences = ["DGEI", "DGI", "DNCC", "DNP", "DGD", "DRH", "DMP", "DCP"];
  if (knownAgences.some(a => a.toLowerCase() === name.toLowerCase())) {
    return false; // C'est une vraie agence
  }

  // Si le nom contient un prénom (probablement un caissier)
  const commonFirstNames = [
    "amadou", "boubacar", "djénéba", "yousouf", "abdoulaye", 
    "moussa", "fatoumata", "mariam", "soumaila", "ibrahima",
    "oumar", "sidi", "hawa", "aminata", "kadiatou"
  ];
  if (commonFirstNames.some(n => name.toLowerCase().includes(n))) {
    return true;
  }

  // Par défaut, considérer comme agence
  return false;
}

function getBoxNumber(record) {
  const possibleKeys = [
    "N° de la Boite",
    "N° de la Boîte",
    "Numéro Boîte",
    "Numero Boite",
    "Box",
    "Boîte",
    "Boite",
    "boxNumber",
  ];

  for (const key of possibleKeys) {
    if (record[key] !== undefined && record[key] !== null) {
      const value = String(record[key]).trim();
      if (value) {
        return value;
      }
    }
  }

  return `BOX-${Date.now()}`;
}

module.exports = { enrichirEtStocker };