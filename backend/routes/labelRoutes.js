const router = require('express').Router();
const labels = require('../services/labelService');
const run = action => async (req,res) => {
  try { res.json({ success: true, data: await action(req) }); }
  catch(error) { console.error('Étiquettes:', error.message); res.status(error.status || 500).json({ success:false, message:error.status ? error.message : 'Enregistrement impossible. Vérifiez la connexion à la base de données.' }); }
};
const id = value => { const number = Number(value); if (!Number.isSafeInteger(number) || number <= 0) throw Object.assign(new Error('Identifiant invalide.'),{status:400}); return number; };
router.get('/',run(req => labels.listLabels(id(req.query.agence_id))));
router.post('/resolve',run(req => labels.resolveLabel(id(req.body.agence_id),id(req.body.type_document_id),String(req.body.numero_boite ?? ''))));
router.get('/:id',run(req => labels.getLabel(id(req.params.id))));
router.put('/:id',run(req => labels.updateLabel(id(req.params.id), req.body)));
module.exports = router;
