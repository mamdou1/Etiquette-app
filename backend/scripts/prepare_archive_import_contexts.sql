-- Préparation des agences et du type documentaire nécessaires à l'import
-- individuel des 70 fichiers des salles 1 et 2.
--
-- Script idempotent : aucune suppression et aucune modification des lignes
-- existantes. Il peut être rejoué sans créer de doublons.
-- Ce script est préparé pour la base configurée par défaut par l'application.
--
-- PRÉPARATION EFFECTUÉE : dans les 12 fichiers ci-dessous, la colonne
-- « Type de document » a été renommée « Description du contenu » avant
-- l'exécution de ce script, afin de conserver le type commun ARCH_HIST :
--   SALLE_1_Agence_Centrale_R6.xlsx
--   SALLE_1_DMG_R11_TE.xlsx
--   SALLE_1_NIAMAKORO_R5_SN.xlsx
--   SALLE_2_Bacodjicoroni_MG.xlsx
--   SALLE_2_Bacodjicoroni_R1.xlsx
--   SALLE_2_Bibliothèque_RNS.xlsx
--   SALLE_2_KATI.xlsx
--   SALLE_2_Kalaban-Coura_R1.xlsx
--   SALLE_2_Kati_-_Bamako-Coura.xlsx
--   SALLE_2_Ouélessébougou_RSN.xlsx
--   SALLE_2_SEBENOKORO_PC_R6.xlsx
--   SALLE_2_État_quotidien_R34.xlsx

USE etiquette;

START TRANSACTION;

DROP TEMPORARY TABLE IF EXISTS tmp_required_archive_agencies;
CREATE TEMPORARY TABLE tmp_required_archive_agencies (
  nom VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL,
  PRIMARY KEY (code)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Les noms déjà présents dans la base sont conservés tels quels, notamment
-- « AGENCE CENTRAL », afin de ne pas créer de doublon sémantique.
INSERT INTO tmp_required_archive_agencies (nom, code) VALUES
  ('AGENCE CENTRAL', 'AC'),
  ('ALBUM DE PHOTOS', 'ALBUM_PHOTOS'),
  ('BACODJICORONI', 'BACODJI'),
  ('BAMAKO-COURA', 'BKO_COURA'),
  ('BIBLIOTHÈQUE', 'BIB'),
  ('BRHL', 'BRHL'),
  ('DAC', 'DAC'),
  ('DAGC', 'DAGC'),
  ('DAJC', 'DAJC'),
  ('DAP', 'DAP'),
  ('DCOM', 'DCOM'),
  ('DECOM', 'DECOM'),
  ('DFC', 'DFC'),
  ('DG', 'DG'),
  ('DIVERS', 'DIVERS'),
  ('DMG', 'DMG'),
  ('DMP', 'DMP'),
  ('DO', 'DO'),
  ('DRHL', 'DRHL'),
  ('ÉTAT QUOTIDIEN', 'ETAT_QUOT'),
  ('GRAND MARCHÉ', 'GRAND MARCHE'),
  ('IGM', 'IGM'),
  ('INSTANCE / M.G.', 'INSTANCE_MG'),
  ('KALABAN-COURA', 'KALABAN_COURA'),
  ('KATI', 'KATI'),
  ('MARCHÉ ROSE', 'MARCHE ROSE'),
  ('N’GOLOMINA', 'NGOLOMINA'),
  ('NIAMAKORO', 'NMKR'),
  ('OUÉLESSÉBOUGOU', 'OUELESSE'),
  ('PIÈCES CAISSE', 'PIECES_CAISSE'),
  ('PNG', 'PNG'),
  ('SE', 'SE'),
  ('SEBENIKORO', 'SBNK');

INSERT INTO agences (nom, code, active, created_at, updated_at)
SELECT required.nom, required.code, 1, NOW(), NOW()
FROM tmp_required_archive_agencies AS required
WHERE NOT EXISTS (
  SELECT 1
  FROM agences AS existing
  WHERE UPPER(existing.code) = UPPER(required.code)
     OR UPPER(existing.nom) = UPPER(required.nom)
);

-- Les feuilles contiennent principalement une description libre du contenu.
-- Un type commun évite de créer artificiellement un type par rayon ou travée.
INSERT INTO type_documents
  (nom, code, description, active, created_at, updated_at)
SELECT
  'Archives historiques',
  'ARCH_HIST',
  'Dossiers historiques inventoriés dans les salles 1 et 2.',
  1,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM type_documents
  WHERE UPPER(code) = 'ARCH_HIST'
     OR UPPER(nom) = UPPER('Archives historiques')
);

-- Association du type commun à toutes les agences nécessaires.
INSERT INTO agence_type_documents (agence_id, type_document_id)
SELECT agency.id, document_type.id
FROM agences AS agency
JOIN tmp_required_archive_agencies AS required
  ON UPPER(required.code) = UPPER(agency.code)
JOIN type_documents AS document_type
  ON UPPER(document_type.code) = 'ARCH_HIST'
LEFT JOIN agence_type_documents AS existing_link
  ON existing_link.agence_id = agency.id
 AND existing_link.type_document_id = document_type.id
WHERE existing_link.agence_id IS NULL;

COMMIT;

-- Contrôles à lire après exécution :
-- 1) chaque agence nécessaire doit apparaître avec un identifiant ;
SELECT
  required.code AS code_attendu,
  required.nom AS nom_attendu,
  agency.id,
  agency.nom,
  agency.active,
  CASE WHEN agency.id IS NULL THEN 'MANQUANTE' ELSE 'OK' END AS statut
FROM tmp_required_archive_agencies AS required
LEFT JOIN agences AS agency
  ON UPPER(agency.code) = UPPER(required.code)
ORDER BY required.nom;

-- 2) chaque agence doit être liée au type « Archives historiques ».
SELECT
  agency.nom AS agence,
  document_type.nom AS type_documentaire,
  CASE
    WHEN link.agence_id IS NULL THEN 'ASSOCIATION MANQUANTE'
    ELSE 'OK'
  END AS statut
FROM tmp_required_archive_agencies AS required
JOIN agences AS agency
  ON UPPER(agency.code) = UPPER(required.code)
JOIN type_documents AS document_type
  ON UPPER(document_type.code) = 'ARCH_HIST'
LEFT JOIN agence_type_documents AS link
  ON link.agence_id = agency.id
 AND link.type_document_id = document_type.id
ORDER BY agency.nom;

-- Correspondance recommandée pour les fichiers comportant plusieurs valeurs
-- de « Service Producteur » : sélectionner l'agence principale ci-dessous.
-- SALLE_1_DO_DRHL_DAJC_R5_TQ.xlsx       -> DO
-- SALLE_1_DRHL_R11_TE.xlsx              -> DRHL
-- SALLE_1_DRHL_R5.xlsx                  -> DRHL
-- SALLE_2_Agence_centrale_R1.xlsx       -> AGENCE CENTRAL
-- SALLE_2_DFC_DIVERS_R7.xlsx            -> DFC
-- SALLE_2_DFC_SWIFT_CNCA_DIVERS.xlsx    -> DFC
-- SALLE_2_DMG_DIVERS_R13.xlsx           -> DMG
-- SALLE_2_DMG_R30.xlsx                  -> DMG
-- SALLE_2_DRHL_DECOM_R3.xlsx            -> DRHL
-- SALLE_2_Divers_IGM_R27.xlsx           -> IGM
-- SALLE_2_IGM_R24.xlsx                  -> IGM
-- SALLE_2_IGM_REGIONS_R24.xlsx          -> IGM
-- SALLE_2_Kati_-_Bamako-Coura.xlsx      -> KALABAN-COURA
-- SALLE_2_PNG_DAP.xlsx                  -> PNG

