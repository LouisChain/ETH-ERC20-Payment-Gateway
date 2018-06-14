const express = require('express')
const app = express()
const cors = require('cors')
const port = 8000;
const bodyParser = require('body-parser');
var cron = require('node-cron');
var mongoose = require('mongoose')
const config = require('./config')
const Web3 = require('web3')

var Payment = require('./models/payment')

var utils = require('./utils')

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors())

var router = express.Router()

require('./routes')(app)

app.listen(port, () => {
    console.log('We are live on ' + port)

    // var input = {"version":3,"id":"eaef302d-7ee2-4484-913b-63120b711626","address":"0e52c423da80c4ab69b2b0f0e77021f3a7e1ba85","Crypto":{"ciphertext":"c67d932707a6f55e6f9d856515c6c70a168e3d347c416b16bcaa256c44a79009","cipherparams":{"iv":"f927cf462deb8f5242491e2cc6cde8dd"},"cipher":"aes-128-ctr","kdf":"scrypt","kdfparams":{"dklen":32,"salt":"b792740f3fa431e5281e2eada8c7a2ba8b672a06c84f0010792f2aaffe112d21","n":8192,"r":8,"p":1},"mac":"6f61947735e77b2b90ae292d449b95fdfdfe0fd24166d2e11ead281904b47d71"}}
    // input = JSON.stringify(input);
    // var password = "123456789";

    // var privateKey = utils.fromV3(input, password, true);
    // console.log(privateKey);

    cron.schedule(config.cron_time, function(){
        const web3 = new Web3(new Web3.providers.HttpProvider(config.eth_server))
        
        web3.eth.getBlockNumber(function(err, currentBlockNum){
            console.log({currentBlockNum: currentBlockNum})

            mongoose.connect(config.mongodb)

        
            Payment.find({status: 'pending'}).exec(function(err, payments) {
                payments.forEach(function(i) {
                    web3.eth.getTransaction(i.tx, function(err, tx) {
                        if (tx) {
                            if (currentBlockNum - tx.blockNumber >= config.confirm_after_block) {
                                // check balance
                                var contract = new web3.eth.Contract(config.token.abi, config.token.contract_address)
                
                                contract.methods.balanceOf(i.to_address).call(function(err, balance) {
                                    if (!err) {
                                        if (balance >= i.amount *  Math.pow(10, config.token.decimals)) {
                                            Payment.findById(i._id, function(err, data) {
                                                data.status = 'completed'
                                                data.save()
                                                // notify as completed ...
                                                console.log('completed');
                                            })
                                        }
                                    }
                                })
                            }
                        } else {
                            Payment.findById(i._id, function(err, data) {
                                if (data.try < 5) {
                                    data.try = data.try + 1
                                } else {
                                    data.status = 'canceled'
                                }
                                data.save()
                            })
                        }
                    
                    })


                })
            })
        })
    });
});