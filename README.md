# 🏷️ Générateur d'Étiquettes

Application web de génération d'étiquettes imprimables à partir d'un fichier Excel.

## Structure du projet

```
Générateur d'étiquettes/
├── backend/               ← API Node.js + Express
│   ├── app.js
│   ├── package.json
│   ├── routes/
│   │   └── upload.js
│   ├── controllers/
│   │   └── uploadController.js
│   └── services/
│       ├── multerService.js
│       └── excelService.js
│
└── frontend/              ← React + TypeScript + Tailwind
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.js
    └── src/
        ├── App.tsx
        ├── index.tsx
        ├── types/index.ts
        ├── services/api.ts
        ├── styles/index.css
        ├── pages/Home.tsx
        └── components/
            ├── FileUpload.tsx
            ├── LabelCard.tsx
            ├── LabelGrid.tsx
            ├── SettingsPanel.tsx
            └── PrintPreview.tsx
```

## Lancement

### 1. Backend

```bash
cd backend
npm install
npm run dev      # démarre sur http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
npm start        # démarre sur http://localhost:3000
```

## Fonctionnalités

- ✅ Import fichier Excel (.xlsx / .xls)
- ✅ Lecture côté backend (Node.js + SheetJS)
- ✅ Conversion automatique en JSON
- ✅ Génération d'étiquettes avec QR Codes
- ✅ Choix du nombre de colonnes (2, 3 ou 4)
- ✅ Choix de la taille des étiquettes (Petit / Moyen / Grand)
- ✅ Sélection des champs à afficher
- ✅ Aperçu A4 temps réel
- ✅ Impression directe navigateur (CSS `@media print`)

## API Backend

| Méthode | Route        | Description                              |
|---------|--------------|------------------------------------------|
| POST    | /api/upload  | Reçoit le .xlsx, retourne JSON des data  |

### Exemple de réponse `/api/upload`

```json
{
  "success": true,
  "filename": "liste.xlsx",
  "total": 2,
  "fields": ["Nom", "Prénom", "Adresse", "Agence"],
  "data": [
    { "Nom": "Diallo", "Prénom": "Moussa", "Adresse": "Bamako", "Agence": "ACI 2000" },
    { "Nom": "Traoré", "Prénom": "Fatoumata", "Adresse": "Sogoniko", "Agence": "Hippodrome" }
  ]
}
```

## Technologies

| Couche    | Technologie              |
|-----------|--------------------------|
| Backend   | Node.js, Express, Multer, SheetJS (xlsx) |
| Frontend  | React, TypeScript, Tailwind CSS, qrcode.react |
