var mongoose = require('mongoose');
 
var schema = mongoose.Schema({
    tx:             {type: 'String', required: true, index:true},
    transaction_id: {type: 'String', required: true, index:true},
    amount:         {type: 'Number', required: true},
    to_address:     {type: 'String', required: true},
    gas_limit:      {type: 'Number', required: true},
    user_id:        {type: 'Number', required: true, index:true},
    status:         {type: 'String', required: true, index:true}, // pending, completed, canceled
    try:            {type: 'Number', required: true}
});
 

module.exports = mongoose.model('Payment', schema);