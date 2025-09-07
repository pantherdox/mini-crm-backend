const router = require('express').Router();
const ctrl = require('../controllers/leadController');
const { auth, requireRole } = require('../middleware/auth');
const { leads: rules } = require('../utils/validation');

router.use(auth);

router.get('/', rules.list, ctrl.list);
router.get('/:id', rules.getById, ctrl.getById);
router.post('/', rules.create, ctrl.create);
router.patch('/:id', rules.update, ctrl.update);
router.delete('/:id', ctrl.softDelete);
router.patch('/:id/archive', ctrl.archive);
router.patch('/:id/unarchive', ctrl.unarchive);
router.post('/:id/convert', rules.convert, ctrl.convert);
router.post('/:id/reassign', ctrl.reassign);

module.exports = router;
