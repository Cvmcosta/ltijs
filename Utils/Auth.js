
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
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs1',
                format: 'pem'
            }
        })

        let {publicKey, privateKey} = keys

        let pubkeyobj = {
            key: publicKey,
            kid: kid
        }
        let privkeyobj = {
            key: privateKey,
            kid: kid
        }

        Database.Insert(false, './provider_data', 'publickeyset', 'keys', pubkeyobj)
        Database.Insert(false, './provider_data', 'privatekeyset', 'keys', privkeyobj)


        return kid
    }

    /**
     * @description Resolves a promisse if the token is valid following LTI 1.3 standards.
     * @param {String} token - JWT token to be verified.
     * @param {Function} getPlatform - getPlatform function to get the platform that originated the token.
     * @returns {Promise}
     */
    static async validateToken(token, getPlatform){
        
        let decoded_token = jwt.decode(token,{complete: true})
        
        let kid = decoded_token.header.kid
        let alg = decoded_token.header.alg

        prov_authdebug("Attempting to retrieve registered platform")
        let platform = getPlatform(decoded_token.payload.iss)
        if(!platform) reject("NoPlatformRegistered")

        let auth_config = platform.platformAuthConfig()
        let key, verified

        try{
            switch(auth_config.method){
                case "JWK_SET":
                    prov_authdebug("Retrieving key from jwk_set")
                    if(!kid) reject("NoKidFoundInToken") 
                    
                    let keys_endpoint = auth_config.key
                    let res = await got.get(keys_endpoint)
                    let keyset = JSON.parse(res.body).keys
                    if(!keyset) reject('NoKeySetFound') 
                    key = jwk.jwk2pem(find(keyset, ['kid', kid]))
                    if(!key) reject('NoKeyFound')
                    
                    
                    verified = await this.verifyToken(token, key, alg, platform)
                    return (verified)

                case "JWK_KEY":
                    prov_authdebug("Retrieving key from jwk_key")
                    if(!auth_config.key) reject('NoKeyFound')
                    
                    key = jwk.jwk2pem(auth_config.key)
                    
                    verified = await this.verifyToken(token, key, alg, platform)
                    return (verified)

                case "RSA_KEY":
                    prov_authdebug("Retrieving key from rsa_key")
                    key = auth_config.key
                    if(!key) reject('NoKeyFound')
                    
                    verified = await this.verifyToken(token, key, alg, platform)
                    return (verified)
            }
        }catch(err){
            throw(err)
        }
        
    }

    /**
     * @description Verifies a token.
     * @param {Object} token - Token to be verified.
     * @param {String} key - Key to verify the token.
     * @param {String} alg - Algorithm used.
     * @param {Platform} platform - Issuer platform.
     */
    static async verifyToken(token, key, alg, platform){
        prov_authdebug("Attempting to verify JWT with the given key")
        
        try{
            let decoded = jwt.verify(token, key, { algorithms: [alg] })
            await this.oidcValidationSteps(decoded, platform, alg)
            
            return decoded
        }catch(err){
            throw (err)
        }
    }

    /**
     * @description Validates de token based on the OIDC specifications.
     * @param {Object} token - Id token you wish to validate.
     * @param {Platform} platform - Platform object.
     * @param {String} alg - Algorithm used.
     */
    static async oidcValidationSteps(token, platform, alg){
        prov_authdebug("Token signature verified")
        prov_authdebug("Initiating OIDC aditional validation steps")
        try{
           
            let aud = this.validateAud(token, platform)
            let _alg = this.validateAlg(alg)
            let iat = this.validateIat(token)
            let nonce = this.validateNonce(token)
            
            return Promise.all([aud, _alg, iat, nonce])
            
        }catch(err){
            throw(err)
        }
    }

    /**
     * @description Validates Aud.
     * @param {Object} token - Id token you wish to validate.
     * @param {Platform} platform - Platform object.
     */
    static async validateAud(token, platform){
        prov_authdebug("Validating if aud (Audience) claim matches the value of the tool's client_id given by the platform")
        prov_authdebug("Aud claim: " + token.aud)
        prov_authdebug("Tool's client_id: " + platform.platformClientId())
        if(!token.aud.includes(platform.platformClientId())) throw("AudDoesNotMatchClientId")
        if(Array.isArray(token.aud)){
            prov_authdebug("More than one aud listed, searching for azp claim")
            if(token.azp && token.azp != platform.platformClientId()) throw("AzpClaimDoesNotMatchClientId")
        }
        return true
    }

    /**
     * @description Validates Aug.
     * @param {String} alg - Algorithm used.
     */
    static async validateAlg(alg){
        prov_authdebug('Checking alg claim. Alg: '+ alg)
        if(alg != 'RS256') throw("NoRSA256Alg")
        return true
    }

    /**
     * @description Validates Iat.
     * @param {Object} token - Id token you wish to validate.
     */
    static async validateIat(token){
        prov_authdebug('Checking iat claim to prevent old tokens from being passed.')
        prov_authdebug('Iat claim: ' + token.iat)
        let cur_time = Date.now()/1000
        prov_authdebug('Current_time: ' + cur_time)
        let time_passed = cur_time - token.iat
        prov_authdebug('Time passed: ' + time_passed)
        if(time_passed > 10) throw("TokenTooOld")
        return true
    }

    /**
     * @description Validates Nonce.
     * @param {Object} token - Id token you wish to validate.
     */
    static async validateNonce(token){
        prov_authdebug('Validating nonce')
        prov_authdebug('Nonce: ' + token.nonce)
        
        if(Database.Get(false, './provider_data', 'nonces', 'nonces', {nonce: token.nonce})) throw("NonceAlreadyStored")
        else{
            prov_authdebug("Storing nonce")
            Database.Insert(false, './provider_data','nonces', 'nonces', {nonce: token.nonce})
            this.deleteNonce(token.nonce)
        }
        return true
    }




    /**
     * @description Gets a new access token from the platform.
     * @param {Platform} platform - Platform object of the platform you want to access.
     */
    static async getAccessToken(platform, ENCRYPTIONKEY){
        try{
            let confjwt = {
                iss: platform.platformClientId(),
                sub: platform.platformClientId(),
                aud: [platform.platformAccessTokenEndpoint()],
                iat: Date.now()/1000,
                exp: Date.now()/1000 + 60,
                jti: crypto.randomBytes(16).toString('base64'),
            }

            let token = jwt.sign(confjwt, platform.platformPrivateKey(), {algorithm: 'RS256', keyid: platform.platformKid()})


            let message = {
                grant_type: 'client_credentials',
                client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
                client_assertion: token,
                scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem https://purl.imsglobal.org/spec/lti-ags/scope/score https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly'

            }

            prov_authdebug("Awaiting return from the platform")
            let res = await got(platform.platformAccessTokenEndpoint(),{body: message, form: true})
            
            prov_authdebug("Successfully generated new access_token")
            let access = JSON.parse(res.body)

            prov_authdebug("Access token: ")
            prov_authdebug(access)

            Database.Insert(ENCRYPTIONKEY, './provider_data', 'access_tokens', 'access_tokens',{platform_url: platform.platformUrl(), token: access})
            
            this.deleteAccessToken(platform.platformUrl(), access.expires_in)

            return access          
                

        }catch(err){
            prov_authdebug(err)
            throw(err)
        }
    }


    /**
     * @description Starts up timer to delete nonce.
     * @param {String} nonce - Nonce.
     */
    static async deleteNonce(nonce){
        setTimeout(()=>{
            Database.Delete(false, './provider_data', 'nonces', 'nonces', {nonce: nonce})
            prov_authdebug('Nonce [' + nonce + '] deleted')
            return true
        }, 10000)
    }



    /**
     * @description Starts up timer to delete access token.
     * @param {String} url - Platform url.
     */
    static async deleteAccessToken(url, time){
        setTimeout(()=>{
            Database.Delete(false, './provider_data', 'access_tokens', 'access_tokens', {platform_url: url})
            prov_authdebug('Access token for [' + url + '] expired')
            return true
        }, (time*1000) - 1)
    }
}




module.exports = Auth