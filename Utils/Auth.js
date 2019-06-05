
const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const crypto = require("crypto")
const fs = require("fs")
const jwk = require('pem-jwk')

/**
 * @description Authentication class manages RSA keys and validation of tokens.
 */
class Auth{

    /**
     * @description Generates a new keypairfor the platform.
     */
    static generateProviderKeyPair(){

        if(!fs.existsSync('./provider_data')) fs.mkdirSync('./provider_data')
        
        let pb_adapter = new FileSync('./provider_data/publickeyset.json')
        let pb = low(pb_adapter)
        pb.defaults({keys: []}).write()

        let piv_adapter = new FileSync('./provider_data/privatekeyset.json')
        let piv = low(piv_adapter)
        piv.defaults({keys: []}).write()


        let kid = crypto.randomBytes(16).toString("hex")

        let keys = crypto.generateKeyPairSync('rsa', {
                                                        modulusLength: 4096,
                                                        publicKeyEncoding: {
                                                            type: 'pkcs1',
                                                            format: 'pem'
                                                        },
                                                        privateKeyEncoding: {
                                                            type: 'pkcs1',
                                                            format: 'pem'
                                                        }
                                                    })

        let {publicKey, privateKey} = keys

        let jwk_publicKey = jwk.pem2jwk(publicKey)
        let jwk_privateKey = jwk.pem2jwk(privateKey)
        jwk_publicKey.kid = kid
        jwk_publicKey.use = "sig"
        

        
        jwk_privateKey.kid = kid
        jwk_privateKey.use = "sig"
        
        
        pb.get('keys').push(jwk_publicKey).write()
        piv.get('keys').push(jwk_privateKey).write()
        
        return kid
    }
}

module.exports = Auth