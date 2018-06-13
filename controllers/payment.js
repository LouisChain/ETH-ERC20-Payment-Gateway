const Web3 = require('web3')
const ethTx = require('ethereumjs-tx')
const config = require('../config')
var mongoose = require('mongoose')
var Payment = require('../models/payment')

var paymentController = {
    // require: transaction_id, amount, to_address, gas_limit
    handle: function(req, res, mongoClient) {
        try {
            const web3 = new Web3(new Web3.providers.HttpProvider(config.eth_server))
        
            var account = web3.eth.accounts.privateKeyToAccount('0x' + req.body.private_key);

            var contract = new web3.eth.Contract(config.token.abi, config.token.contract_address)

            var privateKey = Buffer.from(req.body.private_key, 'hex')

            web3.eth.getTransactionCount(account.address, function(err, count){
                
                if (err) {
                    return res.status(422).json(err);
                }

                const rawTransaction =  {
                    nonce: count,
                    gasLimit: web3.utils.toHex(req.body.gas_limit),
                    gasPrice: web3.utils.toHex(80e9), // 80 Gwei
                    to: config.token.contract_address,
                    value: "0x00",
                    data: contract.methods.transfer(req.body.to_address, req.body.amount * Math.pow(10, config.token.decimals)).encodeABI(),
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
                        payment.to_address          = req.body.to_address
                        payment.gas_limit           = req.body.gas_limit
                        payment.user_id             = req.body.user_id
                        payment.status              = 'pending'
                        payment.try                 = 0
                        
                        payment.save(function(err, post) {
                            if (err) {
                                console.log(err);
                            }
                            else {
                                return res.status(200).json(post)
                            }
                        })
                        
                    } else {
                        return res.status(422).json({})
                        
                    }
                
                });


            })  

        } catch(e) {
            return res.status(422).json(e);
        }
    
    },
}

module.exports = paymentController;


