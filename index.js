//Install moodle for testing
//Test for apache2 and php and mysql



const Lti = require("./main").Provider
const lti = new Lti('1.3', "EXAMPLEKEY")



const fs = require('fs')
const jwt = require('jsonwebtoken')
const got = require('got')
const Platform = require('./Utils/Platform')
const find = require('lodash.find')
const jwk = require('pem-jwk')




//lti.registerPlatform("http://localhost/moodle", "Moodle", "1W8pk8LRuvB1DtO", "http://localhost/moodle/mod/lti/auth.php")

//let plat = lti.getPlatform("http://localhost/moodle")
//console.log(plat.platformPrivateKeyRSA())

console.log(lti.getAllPlatforms())

//lti.deletePlatform("http://localhost/moodle") 



lti.setAppUrl('/')
lti.setLoginUrl('/login')
lti.setKeySetUrl('/keys')

lti.deploy()

/* lti.server.post('/', (req, res)=>{
    console.log("\nID_TOKEN >>> \n")
    let token = res.locals.id_token
    let kid = jwt.decode(token,{complete: true}).header.kid
    let alg = jwt.decode(token,{complete: true}).header.alg
    let keys_endpoint = Platform.findPlatform(jwt.decode(token).iss,"EXAMPLEKEY").platformKeysEndpoint()
    
    got.get(keys_endpoint).then( res => {
        let keyset = JSON.parse(res.body).keys
        let key = jwk.jwk2pem(find(keyset, ['kid', kid]))
        console.log(key)
        jwt.verify(token, key, { algorithms: [alg] },(err, decoded) => {
            if (err) console.error(err)
            else console.log(decoded)
        })
    })

}) */

/* let cert = fs.readFileSync('./provider_data/privateKey.key', "ascii");
console.log(cert)
let jwk_key = jwk.pem2jwk(cert)
jwk_key.kid = "Carlos"
console.log(jwk_key)

let pem_key = jwk.jwk2pem(jwk_key)
console.log(pem_key) */




/* let cert2 = fs.readFileSync('./data/privateKey.key', "utf8");
console.log(cert2)
let key2 = rsaPemToJwk(cert2, {use: 'sig'}, 'public')
console.log(key2) */
//lti.generateKeyPair(true) //MAKE SO THAT I GENERATES ONE FOR EACH PLATFORM


//cache keysets  and add timestamp to better ahndle the caching
//generate keys for each platform
//put them in keyset
//sign jwt with rsa
//put in jwk the alg
// rsa, jwt, keyset -> testar no jwt se ele veio com kid
//aply other validations
//estudar jwk
//achar jeit de converter
