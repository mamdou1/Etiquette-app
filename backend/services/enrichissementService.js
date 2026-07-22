const { AgenceModel, BoiteModel, ArchiveModel } = require("../models");

/**
 * Enrichit les données uploadées et les stocke dans les archives
 */
const enrichirEtStocker = async (records) => {
  const result = [];
  const agenceTrouvees = [];
  const nouvellesAgences = [];
  const archivesToSave = [];

  for (const record of records) {
    const agenceNom = findAgenceField(record);
    
    if (agenceNom) {
      let agence = await AgenceModel.findByNom(agenceNom);
      
      if (!agence) {
        agence = await AgenceModel.findOrCreate(agenceNom);
        nouvellesAgences.push(agenceNom);
      } else {
        agenceTrouvees.push(agenceNom);
      }

      const boites = await BoiteModel.findByAgenceNom(agenceNom);
      
      if (boites.length > 0) {
        for (const boite of boites) {
          const ligne = {
            "N° de la Boite": boite.numero,
            "Date de Production": boite.date_production || "",
            "Type de Document": boite.type_document || "",
            "Nom des caissiers": boite.caissiers || "",
            "Nom de l'Agence": agence.nom,
            "Année": boite.annee || "",
            "Observation": boite.observation || "",
            "Source": "Base de données",
          };
          
          result.push(ligne);
          
          archivesToSave.push({
            numero_boite: boite.numero,
            agence_id: agence.id,
            agence_nom: agence.nom,
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
          numero: boxNumber,
          agence_id: agence.id,
          date_production: record["Date de Production"] || "",
          type_document: record["Type de Document"] || "",
          caissiers: record["Nom des caissiers"] || "",
          annee: record["Année"] || "",
          observation: record["Observation"] || "",
        };
        await BoiteModel.upsert(boiteData);
        
        const ligne = {
          ...record,
          "Source": "Nouvelle agence créée",
        };
        result.push(ligne);
        
        archivesToSave.push({
          numero_boite: boxNumber,
          agence_id: agence.id,
          agence_nom: agence.nom,
          date_production: record["Date de Production"] || "",
          type_document: record["Type de Document"] || "",
          caissiers: record["Nom des caissiers"] || "",
          annee: record["Année"] || "",
          observation: record["Observation"] || "",
          source: "upload",
        });
      }
    } else {
      const boxNumber = getBoxNumber(record);
      
      result.push({
        ...record,
        "Source": "Fichier uploadé (sans agence)",
      });
      
      archivesToSave.push({
        numero_boite: boxNumber,
        agence_id: 0,
        agence_nom: "Sans agence",
        date_production: record["Date de Production"] || "",
        type_document: record["Type de Document"] || "",
        caissiers: record["Nom des caissiers"] || "",
        annee: record["Année"] || "",
        observation: record["Observation"] || "",
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

function findAgenceField(record) {
  const possibleKeys = [
    "Nom de l'Agence",
    "Agence",
    "agence",
    "NomAgence",
    "NOM_AGENCE",
    "nom_agence",
  ];

  for (const key of possibleKeys) {
    if (record[key]) {
      const value = String(record[key]).trim();
      if (value) {
        return value;
      }
    }
  }

  for (const key of Object.keys(record)) {
    const normalizedKey = key
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
    
    if (normalizedKey.includes("agence") || normalizedKey.includes("nom")) {
      const value = String(record[key]).trim();
      if (value) {
        return value;
      }
    }
  }

  return null;
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
    if (record[key]) {
      const value = String(record[key]).trim();
      if (value) {
        return value;
      }
    }
  }

  return `BOX-${Date.now()}`;
}

module.exports = { enrichirEtStocker };