const { body, param, query } = require('express-validator');

const validate = (rules) => [
  ...rules,
  (req, res, next) => {
    const { validationResult } = require('express-validator');
    const result = validationResult(req);
    if (!result.isEmpty()) {
      return res.status(400).json({ errors: result.array() });
    }
    next();
  }
];

const auth = {
  register: validate([
    body('name').isString().notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('role').optional().isIn(['admin','agent'])
  ]),
  login: validate([
    body('email').isEmail(),
    body('password').isString().notEmpty()
  ]),
  refresh: validate([
    body('refreshToken').isString().notEmpty()
  ])
};

const leads = {
  list: validate([
    query('status').optional().isIn(['New','In Progress','Closed Won','Closed Lost']),
    query('q').optional().isString(),
    query('page').optional().isInt({ min:1 }),
    query('limit').optional().isInt({ min:1, max:100 })
  ]),
  getById: validate([
    param('id').isMongoId()
  ]),
  create: validate([
    body('name').isString().notEmpty(),
    body('email').optional().isEmail(),
    body('phone').optional().isString(),
    body('status').optional().isIn(['New','In Progress','Closed Won','Closed Lost']),
    body('source').optional().isString(),
    body('assignedAgent').optional().isString()
  ]),
  update: validate([
    param('id').isMongoId()
  ]),
  convert: validate([
    param('id').isMongoId()
  ])
};

const customers = {
  list: validate([
    query('q').optional().isString(),
    query('page').optional().isInt({ min:1 }),
    query('limit').optional().isInt({ min:1, max:100 })
  ]),
  getById: validate([
    param('id').isMongoId()
  ]),
  create: validate([
    body('name').isString().notEmpty(),
    body('company').optional().isString(),
    body('email').optional().isEmail(),
    body('phone').optional().isString(),
    body('tags').optional().isArray()
  ]),
  update: validate([
    param('id').isMongoId()
  ]),
  addNote: validate([
    param('id').isMongoId(),
    body('text').isString().notEmpty()
  ])
};

const tasks = {
  list: validate([
    query('owner').optional().isMongoId(),
    query('status').optional().isIn(['Open','In Progress','Done']),
    query('due').optional().isString()
  ]),
  create: validate([
    body('title').isString().notEmpty(),
    body('dueDate').isISO8601(),
    body('status').optional().isIn(['Open','In Progress','Done']),
    body('priority').optional().isIn(['Low','Medium','High']),
    body('relatedType').isIn(['Lead','Customer']),
    body('relatedId').isMongoId()
  ]),
  update: validate([
    param('id').isMongoId()
  ])
};

module.exports = { validate, auth, leads, customers, tasks };
