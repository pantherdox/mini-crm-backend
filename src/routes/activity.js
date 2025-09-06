const router = require('express').Router();
const ctrl = require('../controllers/activityController');
const { auth } = require('../middleware/auth');

router.use(auth);
router.get('/', ctrl.list);

module.exports = router;
