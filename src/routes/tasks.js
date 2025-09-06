const router = require('express').Router();
const ctrl = require('../controllers/taskController');
const { auth } = require('../middleware/auth');
const { tasks: rules } = require('../utils/validation');

router.use(auth);

router.get('/', rules.list, ctrl.list);
router.post('/', rules.create, ctrl.create);
router.patch('/:id', rules.update, ctrl.update);

module.exports = router;
