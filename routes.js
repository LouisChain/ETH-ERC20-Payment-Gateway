const { check, validationResult } = require('express-validator/check')
var paymentController = require('./controllers/payment')

module.exports = function(app) {

    app.post('/payment', [
        // username must be an email
        check('transaction_id')
            .not().isEmpty()
            .trim()
            .escape(),

        check('amount').isDecimal(),

        check('gas_limit').isDecimal(),

        check('user_id')
            .not().isEmpty()
            .trim()
            .escape()

    ],
    (req, res) => {
        // Finds the validation errors in this request and wraps them in an object with handy functions
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() });
        }
        
        paymentController.handle(req, res)
    });

}