
const Database = require('./Database')
const crypto = require("crypto")
const jwk = require('pem-jwk')

/**
 * @description Authentication class manages RSA keys and validation of tokens.
 */
class Auth{

    /**
     * @description Generates a new keypairfor the platform.
     */
    static generateProviderKeyPair(){

        let kid = crypto.randomBytes(16).toString("hex")

        while(Database.Get(false, './provider_data', 'publickeyset','keys',{kid: kid})){
            kid = crypto.randomBytes(16).toString("hex")
        }

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
        
        Database.Insert(false, './provider_data', 'publickeyset', 'keys',jwk_publicKey)
        Database.Insert(false, './provider_data', 'privatekeyset', 'keys',jwk_privateKey)
   
        
        return kid
    }
}

module.exports = Auth