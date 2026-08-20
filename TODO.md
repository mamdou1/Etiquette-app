# TODO - Regroupement par numéro de boîte

## Toutes les étapes complétées ✅

- [x] **Types** — `LabelValue`, `BoxGroup` ajoutés
- [x] **LabelCard** — `visibleFields` dynamiques, KEY_MAPPING, caissier émeraude, QR code
- [x] **LabelGrid** — Passe `visibleFields` dynamiques
- [x] **PrintPreview** — Passe `visibleFields` et boîtes groupées
- [x] **Home** — Parsing XLSX client, `detectBoxField` intelligent, `groupByBox`, filtres
- [x] **SettingsPanel** — Drag & Drop des champs
- [x] **Correction importante** : `detectBoxField` utilise maintenant **scoring combiné** :
  - Bonus mots-clés forts (boîte/box/lot) : +10 points
  - Bonus mots-clés faibles (numéro/référence/code) : +2 points
  - Ratio de doublons : 0 à +1 point
  - Pénalité date : -100 points
  - Garantit que le champ "N° Boîte" est toujours détecté prioritairement
- [x] **Correction ordre des fonctions** : `detectBoxField` et `groupByBox` avant `parseExcelToBoxes`

