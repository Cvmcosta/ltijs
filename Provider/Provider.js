/* Main file for the Provider functionalities */





const jwt = require('jsonwebtoken')
const got = require('got')
const find = require('lodash.find')
const jwk = require('pem-jwk')


// Express server to receive the requests
const Server = require('../Utils/Server')

// Handles requests
const Request = require('../Utils/Request')

// Platforms
const Platform = require('../Utils/Platform')

// Authentication
const Auth = require('../Utils/Auth')

// Utils
const Database = require('../Utils/Database')
const url = require('url')
const session = require('express-session')
const cookie = require('cookie')



//Pre-initiated variables
var loginUrl = "/login"
var appUrl = "/"
var keysetUrl = "/keys"
var ltiVersion = 1.3
var ENCRYPTIONKEY
var connect_callback = ()=>{}



/** Exposes methods for easy manipualtion of the LTI standard as a LTI Provider and a "server" object to manipulate the Express instance */
class Provider{

    /**
     * @description Exposes methods for easy manipualtion of the LTI standard as a LTI Provider and a "server" object to manipulate the Express instance.
     * @param {Object} options - Lti Provider options.
     * @param {Object} options.ssl - SSL certificate and key.
     * @param {Object} options.ssl.key - SSL key.
     * @param {Object} options.ssl.cert - SSL certificate.
     * @param {String} [options.lti_version = "1.3"]  - Valid versions are "1.1" and "1.3", it affects how the tool will comunicate with the consumer. Default value is "1.3".
     * @param {String} [options.encryptionkey = "ltikey"] - Encryption key to generate the db with platforms.
     
     */
    constructor(options){
        
        if(!options.ssl || !options.ssl.key || !options.ssl.cert){
            console.error("No ssl Key  or Certificate found.")
        }

        ENCRYPTIONKEY = options.encryptionkey || "ltikey"

        if(options.lti_version && (parseFloat(options.lti_version) == 1.3 || parseFloat(options.lti_version) == 1.1)) ltiVersion = parseFloat(options.lti_version)
        
        this.server = new Server(options.ssl)
        this.app = this.server.app        
        
    }

    /**
     * @description Starts listening to a given port for LTI requests
     * @param {number} port - The port the Provider should listen to
     */
    deploy(port){
        /* In case no port is provided uses 3000 */
        port = port || 3000

        if(ltiVersion == 1.3){
            /* Handles the login */
            this.app.post(loginUrl, (req, res)=>{
                
                //Remove AUTHENDPOINT and add mention to AUTH_CONFIG
                let platform = this.getPlatform(req.body.iss)
                
                
                if (platform) {
                    res.redirect(url.format({
                        pathname: platform.platformAuthEndpoint(),
                        query: Request.lti1_3Login(req.body, platform)
                    }))
                }
                else console.error("Unregistered platform attempting connection: " + req.body.iss)
            })

            
            this.app.post(appUrl, (req, res, next)=>{
                console.log("Receiving POST request on main app route. Attempting to decode IdToken...")
                //Decode and return the token to the user handler
                res.locals.token = req.body.id_token
                next()
            })


            //remover
            //testar se usuario está conectado
            this.app.post('/', (req, res)=>{
                console.log("\nID_TOKEN >>> \n")
                let response = res
                let token = res.locals.token
                let kid = jwt.decode(token,{complete: true}).header.kid
                let alg = jwt.decode(token,{complete: true}).header.alg
                let keys_endpoint = this.getPlatform(jwt.decode(token).iss).platformAuthConfig().key
                
                got.get(keys_endpoint).then( res => {
                    let keyset = JSON.parse(res.body).keys
                    let key = jwk.jwk2pem(find(keyset, ['kid', kid]))
                    console.log(key)
                    jwt.verify(token, key, { algorithms: [alg] },(err, decoded) => {
                        if (err) console.error(err)
                        else {
                            let str_token = JSON.stringify(decoded)

                            let id_token = jwt.sign(str_token, ENCRYPTIONKEY)

                            response.cookie('id_token', id_token,{})
                
                          
                            connect_callback(decoded, response)
                        }
                    })
                })
            
            })



            this.app.get(keysetUrl, (req, res)=>{
                console.log("Sending public keyset...")
              
                let keyset = Database.Get(false, './provider_data', 'publickeyset', 'keys')
                if(keyset) res.json({keys: keyset})
                else res.json({keys: []})

            })


        }

        //Starts server on given port
        this.server.listen(port, "Lti Provider tool is listening on port " + port + "!\n\nLTI provider config: \n>Initiate login URL: " + loginUrl +"\n>App Url: " + appUrl + "\n>Keyset Url: " + keysetUrl +"\n>Lti Version: " + ltiVersion)

        return this
    }

    /**
     * @description Sets the callback function called whenever theres a sucessfull connection, exposing a Conection object containing the id_token decoded parameters.
     * @param {function} _connect_callback - Function that is going to be called everytime a platform sucessfully connects to the provider.
     * @example .onConnect((conection, response)=>{response.send(connection)})
     */
    onConnect(_connect_callback){
        connect_callback = _connect_callback
    }

    /**
     * @description Sets login Url responsible for dealing with the OIDC login flow. If no value is set "/login" is used.
     * @param {string} url - Login url.
     * @example provider.setLoginUrl('/login')
     */
    setLoginUrl(url){
        loginUrl = url
    }

    /**
     * @description Sets main application Url that will receive the final decoded Idtoken. If no value is set "/" (root) is used.
     * @param {string} url - App url.
     * @example provider.setAppUrl('/app')
     */
    setAppUrl(url){
        appUrl = url
    }

    /**
     * @description Sets keyset Url that will return a json containing a set of public keys. If no value is set "/keys" is used.
     * @param {string} url - Keyset url.
     * @example provider.setKeySetUrl('/keyset')
     */
    setKeySetUrl(url){
        keysetUrl = url
    }


    /**
     * @description Registers a platform.
     * @param {string} Url - Platform url.
     * @param {string} name - Platform nickname.
     * @param {string} client_id - Client Id generated by the platform.
     * @param {string} authentication_endpoint - Authentication endpoint that the tool will use to authenticate within the platform.
     * @param {object} [auth_config] - Authentication method and key for verifying messages from the platform. {method: "RSA_KEY", key:"PUBLIC KEY..."}
     */
    registerPlatform(url, name, client_id, authentication_endpoint, auth_config){
        if(!name || !url || !client_id || !authentication_endpoint) {
            console.error("Error registering platform. Missing argument.")
            return false
        }
        let platform  = this.getPlatform(url)
        if(!platform){
            let kid = Auth.generateProviderKeyPair()
            return new Platform(name, url, client_id, authentication_endpoint, kid, ENCRYPTIONKEY, auth_config)
        }else{
            console.error("Platform already registered. Url: " + url)
            return platform
        }
        
    }

    /**
     * @description Gets a platform.
     * @param {string} url - Platform url.
     */
    getPlatform(url){
        if(!url) return false
        
        let obj = Database.Get(ENCRYPTIONKEY, './provider_data', 'platforms', 'platforms', {platform_url: url})

        if(!obj) return false

        return new Platform(obj.platform_name, obj.platform_url, obj.client_id, obj.auth_endpoint, obj.kid, ENCRYPTIONKEY, obj.auth_config)
    }


    /**
     * @description Deletes a platform.
     * @param {string} url - Platform url.
     */
    deletePlatform(url){
        if(!url) return false
        let platform = this.getPlatform(url)
        if(platform) return platform.remove()
    }


    /**
     * @description Gets all platforms.
     */
    getAllPlatforms(){
        let return_array = []

        let platforms = Database.Get(ENCRYPTIONKEY, './provider_data','platforms','platforms')
        
        if(platforms){
            for(let obj of platforms) return_array.push(new Platform(obj.platform_name, obj.platform_url, obj.client_id, obj.auth_endpoint, obj.kid, ENCRYPTIONKEY, obj.auth_config))

            return return_array
        }
        return []
    }


    


}
module.exports = Provider