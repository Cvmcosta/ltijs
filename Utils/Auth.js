
const Database = require('./Database')
const crypto = require("crypto")
const jwk = require('pem-jwk')
const got = require('got')
const find = require('lodash.find')
const jwt = require('jsonwebtoken')




/**
 * @description Authentication class manages RSA keys and validation of tokens.
 */
class Auth{

    /**
     * @description Generates a new keypairfor the platform.
     * @returns {String} kid for the keypair.
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

    /**
     * @description Resolves a promisse if the token is valid following LTI 1.3 standards.
     * @param {String} token - JWT token to be verified.
     * @param {Function} getPlatform - getPlatform function to get the platform that originated the token.
     * @returns {Promise}
     */
    static validateToken(token, getPlatform){
        return new Promise((resolve, reject) =>{
            let decoded_token = jwt.decode(token,{complete: true})
            
            let kid = decoded_token.header.kid
            let alg = decoded_token.header.alg

            let platform = getPlatform(decoded_token.payload.iss)
            if(!platform) reject("NoPlatformRegistered")

            let auth_config = platform.platformAuthConfig()
            let key

            
            switch(auth_config.method){
                case "JWK_SET":
                    
                    if(!kid) reject("NoKidFoundInToken") 
                    
                    let keys_endpoint = auth_config.key
                    got.get(keys_endpoint).then( res => {
                        
                        let keyset = JSON.parse(res.body).keys
                        if(!keyset) reject('NoKeySetFound') 

                        key = jwk.jwk2pem(find(keyset, ['kid', kid]))
                        if(!key) reject('NoKeyFound')
                        
                        
                        this.verifyToken(token, key, alg).then(verified => {
                            resolve(verified)
                        }).catch(err => { reject(err) })

                    }).catch(err => reject(err))

                    break
                case "JWK_KEY":
                    if(!auth_config.key) reject('NoKeyFound')
                    
                    key = jwk.jwk2pem(auth_config.key)
                    
                    this.verifyToken(token, key, alg).then(verified => {
                        resolve(verified)
                    }).catch(err => { reject(err) })


                    break
                case "RSA_KEY":
                    key = auth_config.key
                    if(!key) reject('NoKeyFound')
                    
                    this.verifyToken(token, key, alg).then(verified => {
                        resolve(verified)
                    }).catch(err => { reject(err) })
                    break
            }
        })
    }

    /**
     * @description Verifies a token.
     * @param token - Token to be verified.
     * @param key - Key to verify the token.
     * @param alg - Algorithm used.
     */
    static verifyToken(token, key, alg){
        return new Promise((resolve, reject)=>{
            if(alg){
                jwt.verify(token, key, { algorithms: [alg] },(err, decoded) => {
                    if (err) reject(err)
                    else {
                        resolve(decoded)
                    }
                })
            }else{
                jwt.verify(token, key, (err, decoded) => {
                    if (err) reject(err)
                    else {
                        resolve(decoded)
                    }
                })
            }
        })
        

    }
}

module.exports = Auth