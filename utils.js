var ethUtil = require('ethereumjs-util');
ethUtil.scrypt = require('scryptsy');
ethUtil.crypto = require('crypto');

var utils = {
    fromV3: function(input, password, nonStrict) {
        var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

        var json = (typeof input === 'undefined' ? 'undefined' : _typeof(input)) === 'object' ? input : JSON.parse(nonStrict ? input.toLowerCase() : input);

        if (json.version != 3) {
            throw new Error('Not a V3 wallet');
        }
        var derivedKey;
        var kdfparams;
        if(!json.crypto) {
            json.crypto = json.Crypto;
        }
        if (json.crypto.kdf === 'scrypt') {
            kdfparams = json.crypto.kdfparams;
            derivedKey = ethUtil.scrypt(new Buffer(password), new Buffer(kdfparams.salt, 'hex'), kdfparams.n, kdfparams.r, kdfparams.p, kdfparams.dklen);
        } else if (json.crypto.kdf === 'pbkdf2') {
            kdfparams = json.crypto.kdfparams;
            if (kdfparams.prf !== 'hmac-sha256') {
                throw new Error('Unsupported parameters to PBKDF2');
            }
            derivedKey = ethUtil.crypto.pbkdf2Sync(new Buffer(password), new Buffer(kdfparams.salt, 'hex'), kdfparams.c, kdfparams.dklen, 'sha256');
        } else {
            throw new Error('Unsupported key derivation scheme');
        }
        var ciphertext = new Buffer(json.crypto.ciphertext, 'hex');
        var mac = ethUtil.sha3(Buffer.concat([derivedKey.slice(16, 32), ciphertext]));

        if (mac.toString('hex') !== json.crypto.mac) {
            throw new Error('Key derivation failed - possibly wrong passphrase');
        }
        var decipher = ethUtil.crypto.createDecipheriv(json.crypto.cipher, derivedKey.slice(0, 16), new Buffer(json.crypto.cipherparams.iv, 'hex'));
        var seed = utils.decipherBuffer(decipher, ciphertext, 'hex');
        while (seed.length < 32) {
            var nullBuff = new Buffer([0x00]);
            seed = Buffer.concat([nullBuff, seed]);
        }
    
        return seed;
    },
    
    decipherBuffer: function (decipher, data) {
        return Buffer.concat([decipher.update(data), decipher.final()]);
    },

    bufferToStr: function(buffer) {
        var str = '';
        for(i = 0, l = buffer.length; i < l; i++){
            var temp = buffer[i].toString(16);
            str += temp.length == 1 ? '0' + temp : temp;
        }
        return str;
    }
}

module.exports = utils;