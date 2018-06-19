const express = require('express')
const app = express()
const cors = require('cors')
const port = 8000;
const bodyParser = require('body-parser');
var cron = require('node-cron');
var mongoose = require('mongoose')
const config = require('./config')
const Web3 = require('web3')
const Payment = require('./models/payment')

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors())

var router = express.Router()

require('./routes')(app)

app.listen(port, () => {
    console.log('We are live on ' + port)

    cron.schedule(config.cron_time, function(){
        const web3 = new Web3(new Web3.providers.HttpProvider(config.eth_server))
        
        mongoose.connect(config.mongodb)

        Payment.find({status: 'pending'}).exec(function(err, payments) {
            
            if (payments.length > 0) {
                web3.eth.getBlockNumber(function(err, currentBlockNum){
                    payments.forEach(function(i) {
                        web3.eth.getTransactionReceipt(i.tx, function(e, tx) {
                            try {
                                if (!e) {
                                    if (currentBlockNum - tx.blockNumber >= config.confirm_after_block) {
                                        if (parseInt(tx.logs[0].data, 16)  >= i.amount *  Math.pow(10, config.token.decimals)) {
                                            Payment.findById(i._id, function(err, data) {
                                                data.status = 'completed'
                                                data.save()
                                                // notify as completed ...
                                                console.log(data);
                                            })
                                        }
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
                            } catch($e) {

                            }
                        
                        });
                    })
                })
            }

        })
    
    });
});
