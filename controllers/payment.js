const Web3 = require('web3')
const ethTx = require('ethereumjs-tx')
const config = require('../config')
var mongoose = require('mongoose')
var Payment = require('../models/payment')
var utils = require('../utils')

var paymentController = {
    // require: transaction_id, amount, to_address, gas_limit
    // private_key or json_key_store and password
    handle: function(req, res, mongoClient) {
        try {
            const web3 = new Web3(new Web3.providers.HttpProvider(config.eth_server))
    
            var contract = new web3.eth.Contract(config.token.abi, config.token.contract_address)

            if (req.body.json_key_store && req.body.password) {
                if (typeof req.body.json_key_store == 'object') {
                    var jsonKeyStore = JSON.stringify(req.body.json_key_store);
                } else {
                    var jsonKeyStore = req.body.json_key_store;
                }

                //json_key_store = {"version":3,"id":"eaef302d-7ee2-4484-913b-63120b711626","address":"0e52c423da80c4ab69b2b0f0e77021f3a7e1ba85","Crypto":{"ciphertext":"c67d932707a6f55e6f9d856515c6c70a168e3d347c416b16bcaa256c44a79009","cipherparams":{"iv":"f927cf462deb8f5242491e2cc6cde8dd"},"cipher":"aes-128-ctr","kdf":"scrypt","kdfparams":{"dklen":32,"salt":"b792740f3fa431e5281e2eada8c7a2ba8b672a06c84f0010792f2aaffe112d21","n":8192,"r":8,"p":1},"mac":"6f61947735e77b2b90ae292d449b95fdfdfe0fd24166d2e11ead281904b47d71"}};
                //json_key_store = JSON.stringify(json_key_store);

                var privateKey = utils.fromV3(jsonKeyStore, req.body.password);

            } else {
                var privateKey = Buffer.from(req.body.private_key, 'hex');
            }

            var account = web3.eth.accounts.privateKeyToAccount('0x' +  utils.bufferToStr(privateKey));

            web3.eth.getTransactionCount(account.address, function(err, count){
                
                if (err) {
                    return res.status(422).json({message: "Can't get sender address info"});
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
                        return res.status(422).json({message: "Can't send tx"})
                    }
                
                });

            })  

        } catch(e) {
            return res.status(422).json({message: "Error", e : e});
        }
    
    },

}

module.exports = paymentController;


