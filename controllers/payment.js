const Web3 = require('web3')
const ethTx = require('ethereumjs-tx')
const config = require('../config')
var mongoose = require('mongoose')
var Payment = require('../models/payment')
var utils = require('../utils')

var paymentController = {
    // require: transaction_id, amount, gas_limit
    // private_key or json_key_store and password
    handle: function(req, res) {
        try {
            
            const web3 = new Web3(new Web3.providers.HttpProvider(config.eth_server))
    
            var contract = new web3.eth.Contract(config.token.abi, config.token.contract_address)

            if (req.body.json_key_store && req.body.password) {
                if (typeof req.body.json_key_store == 'object') {
                    var jsonKeyStore = JSON.stringify(req.body.json_key_store);
                } else {
                    var jsonKeyStore = req.body.json_key_store;
                }
                
                var privateKey = utils.fromV3(jsonKeyStore, req.body.password);

            } else {
                var privateKey = Buffer.from(req.body.private_key, 'hex');
            }

            var account = web3.eth.accounts.privateKeyToAccount('0x' +  utils.bufferToStr(privateKey));

            web3.eth.getTransactionCount(account.address, 'pending', function(err, count){
                
                if (err) {
                    return res.status(422).json({message: "Can't get sender address info"});
                }

                const rawTransaction =  {
                    nonce: count,
                    gasLimit: web3.utils.toHex(req.body.gas_limit),
                    gasPrice: web3.utils.toHex(80e9), // 80 Gwei
                    to: config.token.contract_address,
                    value: "0x00",
                    data: contract.methods.transfer(config.destination_address, req.body.amount * Math.pow(10, config.token.decimals)).encodeABI(),
                    chainId : config.token.chainId
                }

                var transaction = new ethTx(rawTransaction)

                transaction.sign(privateKey)

                web3.eth.sendSignedTransaction('0x' + transaction.serialize().toString('hex'), function(err, tx) {

                    if (tx) {
                        mongoose.connect(config.mongodb)

                        payment = new Payment()

                        payment.tx                  = tx
                        payment.transaction_id      = req.body.transaction_id
                        payment.amount              = req.body.amount
                        payment.to_address          = config.destination_address
                        payment.gas_limit           = req.body.gas_limit
                        payment.user_id             = req.body.user_id
                        payment.status              = 'pending'
                        payment.try                 = 0
                        payment.from_address        = account.address

                        payment.save(function(err, post) {
                            if (err) {
                                console.log(err);
                            }
                            else {
                                return res.status(200).json(post)
                            }
                        })

                    } else {
                        return res.status(422).json({message: "Can't send tx"})
                    }
                    
                })
            })  

        } catch(e) {
            return res.status(422).json({message: "Error", e : e});
        }
    
    },

}

module.exports = paymentController;


