//Install moodle for testing
//Test for apache2 and php and mysql


const fs = require('fs')

const Lti = require("./main").Provider



const privateKey  = fs.readFileSync('./ssl/server.key', 'utf8')
const certificate = fs.readFileSync('./ssl/server.cert', 'utf8')

const lti = new Lti({lti_version: "1.3", encryptionkey:"EXAMPLEKEY", https:true, ssl:{key: privateKey, cert: certificate}})

lti.setAppUrl('/')
lti.setLoginUrl('/login')
lti.setKeySetUrl('/keys')

lti.registerPlatform("http://localhost/moodle", "Moodle", "1W8pk8LRuvB1DtO", "http://localhost/moodle/mod/lti/auth.php", {method: "JWK_SET", key: "http://localhost/moodle/mod/lti/certs.php"})



console.log(lti.getAllPlatforms())


lti.deploy().onConnect((connection, response)=>{
    console.log(connection)
    lti.server.setStaticPath(__dirname+'/views/teste')
    response.sendFile('/dist/index.html',{ root: './views/teste'})
})







//cache keysets  and add timestamp to better ahndle the caching
//aply other validations
/* prompt
OPTIONAL. Space delimited, case sensitive list of ASCII string values that specifies whether the Authorization Server prompts the End-User for reauthentication and consent. The defined values are:
none
The Authorization Server MUST NOT display any authentication or consent user interface pages. An error is returned if an End-User is not already authenticated or the Client does not have pre-configured consent for the requested Claims or does not fulfill other conditions for processing the request. The error code will typically be login_required, interaction_required, or another code defined in Section 3.1.2.6. This can be used as a method to check for existing authentication and/or consent.
login
The Authorization Server SHOULD prompt the End-User for reauthentication. If it cannot reauthenticate the End-User, it MUST return an error, typically login_required.
consent
The Authorization Server SHOULD prompt the End-User for consent before returning information to the Client. If it cannot obtain consent, it MUST return an error, typically consent_required.
select_account
The Authorization Server SHOULD prompt the End-User to select a user account. This enables an End-User who has multiple accounts at the Authorization Server to select amongst the multiple accounts that they might have current sessions for. If it cannot obtain an account selection choice made by the End-User, it MUST return an error, typically account_selection_required. */


/* state n stuff */