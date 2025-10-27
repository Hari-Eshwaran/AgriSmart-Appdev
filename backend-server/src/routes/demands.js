const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const {
    createDemand,
    getDemands,
    getDemandById,
    updateDemand,
    deleteDemand,
    respondToDemand
} = require('../controllers/demands');

const router = express.Router();

const validate = (validations) => {
    return async (req, res, next) => {
        await Promise.all(validations.map(v => v.run(req)));
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() });
        }
        next();
    };
};

// Buyers create demands
router.post('/',
    authenticateToken,
    authorizeRoles('buyer'),
    validate([
        body('commodity').isString().notEmpty().withMessage('commodity is required'),
        body('quantity').isFloat({ gt: 0 }).withMessage('quantity must be a positive number'),
        body('unit').optional().isString(),
        body('desiredBy').optional().isISO8601(),
        body('notes').optional().isString()
    ]),
    createDemand
);

// List demands: behaviour depends on role (buyer -> own, farmer -> open/assigned, admin -> all)
router.get('/',
    // optional auth is allowed; treat unauthenticated as public
    validate([
        query('page').optional().isInt({ min: 1 }),
        query('limit').optional().isInt({ min: 1, max: 200 }),
        query('status').optional().isString(),
        query('commodity').optional().isString()
    ]),
    getDemands
);

// Get single demand by id (auth optional)
router.get('/:id',
    validate([ param('id').isMongoId().withMessage('Invalid demand id') ]),
    getDemandById
);

// Buyer updates or cancels their demand while open
router.put('/:id',
    authenticateToken,
    validate([
        param('id').isMongoId(),
        body('commodity').optional().isString(),
        body('quantity').optional().isFloat({ gt: 0 }),
        body('unit').optional().isString(),
        body('desiredBy').optional().isISO8601(),
        body('notes').optional().isString()
    ]),
    updateDemand
);
router.delete('/:id',
    authenticateToken,
    validate([ param('id').isMongoId() ]),
    deleteDemand
);

// Farmer responds to a demand (accept / reject)
router.post('/:id/respond',
    authenticateToken,
    authorizeRoles('farmer'),
    validate([
        param('id').isMongoId(),
        body('action').isIn(['accept','reject']).withMessage('action must be accept or reject'),
        body('priceOffer').optional().isFloat({ gt: 0 }),
        body('notes').optional().isString()
    ]),
    respondToDemand
);

module.exports = router;
