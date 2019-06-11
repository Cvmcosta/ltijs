
const Database = require('./Database')
const crypto = require("crypto")
const jwk = require('pem-jwk')
const got = require('got')
const find = require('lodash.find')
const jwt = require('jsonwebtoken')
const prov_authdebug = require('debug')('provider:auth')
const cons_authdebug = require('debug')('consumer:auth')





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

            prov_authdebug("Attempting to retrieve registered platform")
            let platform = getPlatform(decoded_token.payload.iss)
            if(!platform) reject("NoPlatformRegistered")

            let auth_config = platform.platformAuthConfig()
            let key

            
            switch(auth_config.method){
                case "JWK_SET":
                    prov_authdebug("Retrieving key from jwk_set")
                    if(!kid) reject("NoKidFoundInToken") 
                    
                    let keys_endpoint = auth_config.key
                    got.get(keys_endpoint).then( res => {
                        
                        let keyset = JSON.parse(res.body).keys
                        if(!keyset) reject('NoKeySetFound') 

                        key = jwk.jwk2pem(find(keyset, ['kid', kid]))
                        if(!key) reject('NoKeyFound')
                        
                        
                        this.verifyToken(token, key, alg, platform).then(verified => {
                            resolve(verified)
                        }).catch(err => { reject(err) })

                    }).catch(err => reject(err))

                    break
                case "JWK_KEY":
                    prov_authdebug("Retrieving key from jwk_key")
                    if(!auth_config.key) reject('NoKeyFound')
                    
                    key = jwk.jwk2pem(auth_config.key)
                    
                    this.verifyToken(token, key, alg, platform).then(verified => {
                        resolve(verified)
                    }).catch(err => { reject(err) })


                    break
                case "RSA_KEY":
                    prov_authdebug("Retrieving key from rsa_key")
                    key = auth_config.key
                    if(!key) reject('NoKeyFound')
                    
                    this.verifyToken(token, key, alg, platform).then(verified => {
                        resolve(verified)
                    }).catch(err => { reject(err) })
                    break
            }
        })
    }

    /**
     * @description Verifies a token.
     * @param {Object} token - Token to be verified.
     * @param {String} key - Key to verify the token.
     * @param {String} alg - Algorithm used.
     * @param {Platform} platform - Issuer platform.
     */
    static verifyToken(token, key, alg, platform){
        prov_authdebug("Attempting to verify JWT with the given key")
        return new Promise((resolve, reject)=>{
            if(alg){
                jwt.verify(token, key, { algorithms: [alg] },(err, decoded) => {
                    if (err) reject(err)
                    else {
                        this.oidcValidationSteps(decoded, platform, alg).then(res=>{
                            resolve(decoded)
                        }).catch(err=>{
                            reject(err)
                        })
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

    /**
     * @description Validates de token based on the OIDC specifications.
     * @param {Object} token - Id token you wish to validate.
     * @param {Platform} platform - Platform object.
     */
    static oidcValidationSteps(token, platform, alg){
        prov_authdebug("Initiating OIDC aditional validation steps")
        return new Promise((resolve, reject) => {
           
            prov_authdebug("Validating aud (Audience) claim matches the value of the tool's client_id given by the platform")
            prov_authdebug("Aud claim: " + token.aud)
            prov_authdebug("Tool's client_id: " + platform.platformClientId())
            if(!token.aud.includes(platform.platformClientId())) reject("AudDoesNotMatchClientId")
            if(Array.isArray(token.aud)){
                prov_authdebug("More than one aud listed, searching for azp claim")
                if(token.azp && token.azp != platform.platformClientId()) reject("AzpClaimDoesNotMatchClientId")
            }

            prov_authdebug('Checking alg claim. Alg: '+ alg)
            if(alg != 'RS256') reject("NoRSA256Alg")

            prov_authdebug('Checking iat claim to prevent old tokens from being passed.')
            prov_authdebug('Iat claim: ' + token.iat)
            let cur_time = Date.now()/1000
            prov_authdebug('Current_time: ' + cur_time)
            let time_passed = cur_time - token.iat
            prov_authdebug('Time passed: ' + time_passed)
            if(time_passed > 10) reject("TokenTooOld")

            prov_authdebug('Validating nonce')
            prov_authdebug('Nonce: ' + token.nonce)
            
            if(Database.Get(false, './provider_data', 'nonces', 'nonces', {nonce: token.nonce})) reject("NonceAlreadyStored")
            else{
                prov_authdebug("Storing nonce")
                Database.Insert(false, './provider_data','nonces', 'nonces', {nonce: token.nonce})
                this.deleteNonce(token.nonce).then(()=>{prov_authdebug('Nonce [' + token.nonce + '] deleted')})
            }

            
            resolve(true)
            
        })
    }

    /**
     * @description Starts up timer to delete nonce.
     * @param {String} nonce - Nonce.
     */
    static deleteNonce(nonce){
        return new Promise(resolve => {
            setTimeout(()=>{
                Database.Delete(false, './provider_data', 'nonces', 'nonces', {nonce: nonce})
                resolve(true)
            }, 10000)
        })
    }
}

module.exports = Auth