const router = require('express').Router();
const ctrl = require('../controllers/customerController');
const { auth } = require('../middleware/auth');
const { customers: rules } = require('../utils/validation');

router.use(auth);

router.get('/', rules.list, ctrl.list);
router.get('/:id', rules.getById, ctrl.getById);
router.post('/', rules.create, ctrl.create);
router.patch('/:id', rules.update, ctrl.update);
router.post('/:id/notes', rules.addNote, ctrl.addNote);

module.exports = router;
