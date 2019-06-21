//Install moodle for testing
//Test for apache2 and php and mysql


const fs = require('fs')


const Lti = require("./main").Provider




const privateKey  = fs.readFileSync('./ssl/server.key', 'utf8')
const certificate = fs.readFileSync('./ssl/server.cert', 'utf8')

const lti = new Lti({lti_version: "1.3", encryptionkey:"EXAMPLEKEY", https:true, ssl:{key: privateKey, cert: certificate}, staticPath:__dirname+'/views/teste'})

lti.appUrl('/')
lti.loginUrl('/login')


lti.registerPlatform("http://172.18.53.34", "Educsaite", "3tHEfEFArAGH7FG", "http://172.18.53.34/mod/lti/auth.php", 'http://172.18.53.34/mod/lti/token.php',{method: "JWK_SET", key: "http://172.18.53.34/mod/lti/certs.php"})



let plat = lti.getPlatform("http://localhost/moodle")

console.log(plat.platformPublicKey())


//Delete access token on startup

lti.deploy().onConnect((connection, request, response, next)=>{
    //console.log(connection['https://purl.imsglobal.org/spec/lti/claim/custom'].teste)
    response.sendFile(__dirname+'/views/teste/dist/index.html')
    //lti.messagePlatform(connection)
},{maxAge: 1000*60*60})









/* state n stuff */