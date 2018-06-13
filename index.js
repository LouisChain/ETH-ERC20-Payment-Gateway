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

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors())

var router = express.Router()

require('./routes')(app)

app.listen(port, () => {
    console.log('We are live on ' + port)

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