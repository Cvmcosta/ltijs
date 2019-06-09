/* Main file for the Provider functionalities */

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
const jwt = require('jsonwebtoken')



//Pre-initiated variables
var loginUrl = "/login"
var appUrl = "/"
var keysetUrl = "/keys"
var sessionTimeoutUrl = '/sessionTimeout'
var invalidTokenUrl = '/invalidToken'
var ltiVersion = 1.3
var ENCRYPTIONKEY

var cookie_options ={
    maxAge: 1000*60*60,
    secure: true,
    httpOnly: true,
    signed: true
}


var connect_callback = ()=>{}

var sessionTimedOut = (req, res, next)=>{
    res.status(401).send("Session timed out. Please reinitiate login.")
}
var invalidToken = (req, res, next)=>{
    res.status(401).send("Invalid token. Please reinitiate login.")
}




/** Exposes methods for easy manipualtion of the LTI standard as a LTI Provider and a "server" object to manipulate the Express instance */
class Provider{

    /**
     * @description Exposes methods for easy manipualtion of the LTI standard as a LTI Provider and a "server" object to manipulate the Express instance.
     * @param {Object} options - Lti Provider options.
     * @param {String} options.encryptionkey - Encryption key to generate the db with platforms.
     * @param {String} [options.lti_version = "1.3"]  - Valid versions are "1.1" and "1.3", it affects how the tool will comunicate with the consumer. Default value is "1.3".
     
     * @param {Boolean} [options.https = false] - Set this as true in development if you are not using any web server to redirect to your tool (like Nginx) as https. If you really dont want to use https, disable the secure flag in the cookies option, so that it can be passed via http.
     * @param {Object} [options.ssl] - SSL certificate and key if https is enabled.
     * @param {Object} [options.ssl.key] - SSL key.
     * @param {Object} [options.ssl.cert] - SSL certificate. 
     * @param {String} [options.staticPath] - The path for the static files your application might serve (Ex: _dirname+"/public")
     */
    constructor(options){
        
        if(options && options.https && (!options.ssl || !options.ssl.key || !options.ssl.cert)){
            console.error("No ssl Key  or Certificate found for local https configuration.")
            return false
        }

        if(!options || !options.encryptionkey) {
            console.error("Encryptionkey parameter missing in options")
            return false
        }
        ENCRYPTIONKEY = options.encryptionkey

        if(options.lti_version && (parseFloat(options.lti_version) == 1.3 || parseFloat(options.lti_version) == 1.1)) ltiVersion = parseFloat(options.lti_version)
        
        this.server = new Server(options.https, options.ssl, ENCRYPTIONKEY)
        this.app = this.server.app

        if(options.staticPath) this.server.setStaticPath(options.staticPath)


        //Registers main athentication middleware
        let sessionValidator = (req, res, next)=>{
            
            //Ckeck if request is attempting to initiate oidc login flow
            if(req.url != loginUrl && req.url!=keysetUrl && req.url != sessionTimeoutUrl && req.url != invalidTokenUrl){
        
                //Check if user already has session cookie stored in its browser
                let it = req.signedCookies.it 
                if(!it){
                    
                    if(req.body.id_token){
                        Auth.validateToken(req.body.id_token, this.getPlatform).then( valid => {
                            //Study diferent encodings
                            valid.exp = (Date.now() / 1000) + (cookie_options.maxAge/1000)
                            let it = jwt.sign(valid, ENCRYPTIONKEY)
                            res.cookie('it', it, cookie_options)
                            res.locals.token = valid
                            return next()
                        }).catch(err => {
                            console.error(err)
                            return res.redirect(invalidTokenUrl)
                        }) 
                    }else{
                        return res.redirect(sessionTimeoutUrl)
                    }
                }else{
                    jwt.verify(it, ENCRYPTIONKEY, (err, valid)=>{
                        if (err) {console.log(err);return res.redirect(invalidTokenUrl)}
                        else{
                            valid.exp = (Date.now() / 1000) + (cookie_options.maxAge/1000)
                            let it = jwt.sign(valid, ENCRYPTIONKEY)
                            res.cookie('it', it, cookie_options)
                            res.locals.token = valid
                            return next()
                        }
                    })
                }
            }else{
                return next()
            }
            
            
        }
        this.app.use(sessionValidator)
        
    }

    /**
     * @description Starts listening to a given port for LTI requests
     * @param {number} port - The port the Provider should listen to
     */
    deploy(port){
        /* In case no port is provided uses 3000 */
        port = port || 3000

        if(ltiVersion == 1.3){
            

            /* Initiates oidc login flow */
            this.app.post(loginUrl, (req, res)=>{
                let platform = this.getPlatform(req.body.iss)
                  
                if (platform) {
                    res.redirect(url.format({
                        pathname: platform.platformAuthEndpoint(),
                        query: Request.lti1_3Login(req.body, platform)
                    }))
                }
                else console.error("Unregistered platform attempting connection: " + req.body.iss)
            })

            //Keyset route
            this.app.get(keysetUrl, (req, res)=>{
                console.log("Sending public keyset...")
                let keyset = Database.Get(false, './provider_data', 'publickeyset', 'keys')
                if(keyset) res.json({keys: keyset})
                else res.json({keys: []})
            })


            //Session timeout and invalid token urls
            this.app.all(sessionTimeoutUrl, (req, res, next)=>{
                sessionTimedOut(req, res, next)
            })

            this.app.all(invalidTokenUrl, (req, res, next)=>{
                invalidToken(req, res, next)
            })


            //Main app 
            this.app.post(appUrl, (req, res, next)=>{
                connect_callback(res.locals.token, req, res, next)
            })

        }

        //Starts server on given port
        this.server.listen(port, "Lti Provider tool is listening on port " + port + "!\n\nLTI provider config: \n>Initiate login URL: " + loginUrl +"\n>App Url: " + appUrl + "\n>Keyset Url: " + keysetUrl + "\n>Session Timeout Url: " + sessionTimeoutUrl + "\n>Invalid Token Url: " + invalidTokenUrl  + "\n>Lti Version: " + ltiVersion)
   
        
        return this
    }

    /**
     * @description Sets the callback function called whenever theres a sucessfull connection, exposing a Conection object containing the id_token decoded parameters.
     * @param {Function} _connect_callback - Function that is going to be called everytime a platform sucessfully connects to the provider.
     * @param {Object} [options] - Options configuring the usage of cookies to pass the Id Token data to the client. 
     * @param {Number} [options.maxAge = 1000 * 60 * 60] - MaxAge of the cookie in miliseconds.
     * @param {Boolean} [options.secure = true] - Secure property of the cookie.
     * @param {Function} [options.sessionTmeout] - Route function executed everytime the session expires. It must in the end return a 401 status, even if redirects ((req, res, next) => {res.sendStatus(401)}).
     * @param {Function} [options.invalidToken] - Route function executed everytime the system receives an invalid token or cookie. It must in the end return a 401 status, even if redirects ((req, res, next) => {res.sendStatus(401)}).
     * @example .onConnect((conection, response)=>{response.send(connection)}, {secure: true})
     */
    onConnect(_connect_callback, options){
        
        if(options){
            
            cookie_options.maxAge = options.maxAge || 1000*60*60

            if(options.secure != undefined) cookie_options.secure = options.secure
            else cookie_options.secure = true


            if(options.sessionTimeout) sessionTimedOut = options.sessionTimeout
            if(options.invalidToken) invalidToken = options.invalidToken
            
        }
        
        
        
        connect_callback = _connect_callback
    }

    /**
     * @description Gets/Sets login Url responsible for dealing with the OIDC login flow. If no value is set "/login" is used.
     * @param {string} url - Login url.
     * @example provider.loginUrl('/login')
     */
    loginUrl(url){
        if(!url) return loginUrl
        loginUrl = url
    }

    /**
     * @description Gets/Sets main application Url that will receive the final decoded Idtoken. If no value is set "/" (root) is used.
     * @param {string} url - App url.
     * @example provider.appUrl('/app')
     */
    appUrl(url){
        if(!url) return appUrl
        appUrl = url
    }

    /**
     * @description Gets/Sets keyset Url that will return a json containing a set of public keys. If no value is set "/keys" is used.
     * @param {string} url - Keyset url.
     * @example provider.keySetUrl('/keyset')
     */
    keySetUrl(url){
        if(!url) return keysetUrl
        keysetUrl = url
    }


    /**
     * @description Gets/Sets session timeout Url that will be called whenever the system encounters a session timeout. If no value is set "/sessionTimeout" is used.
     * @param {string} url - Session timeout url.
     * @example provider.sessionTimeoutUrl('/sesstimeout')
     */
    sessionTimeoutUrl(url){
        if(!url) return sessionTimeoutUrl
        sessionTimeoutUrl = url
    }

    /**
     * @description Gets/Sets invalid token Url that will be called whenever the system encounters a invalid token or cookie. If no value is set "/invalidToken" is used.
     * @param {string} url - Invalid token url.
     * @example provider.invalidTokenUrl('/invtoken')
     */
    invalidTokenUrl(url){
        if(!url) return invalidTokenUrl
        invalidTokenUrl = url
    }

    

    /**
     * @description Registers a platform.
     * @param {string} Url - Platform url.
     * @param {string} name - Platform nickname.
     * @param {string} client_id - Client Id generated by the platform.
     * @param {string} authentication_endpoint - Authentication endpoint that the tool will use to authenticate within the platform.
     * @param {object} auth_config - Authentication method and key for verifying messages from the platform. {method: "RSA_KEY", key:"PUBLIC KEY..."}
     * @param {String} auth_config.method - Method of authorization "RSA_KEY" or "JWK_KEY" or "JWK_SET".
     * @param {String} auth_config.key - Either the RSA public key provided by the platform, or the JWK key, or the JWK keyset address.
     */
    registerPlatform(url, name, client_id, authentication_endpoint, auth_config){
        if(!name || !url || !client_id || !authentication_endpoint || !auth_config) {
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