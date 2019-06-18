//Install moodle for testing
//Test for apache2 and php and mysql


const fs = require('fs')


const Lti = require("./main").Provider




const privateKey  = fs.readFileSync('./ssl/server.key', 'utf8')
const certificate = fs.readFileSync('./ssl/server.cert', 'utf8')

const lti = new Lti({lti_version: "1.3", encryptionkey:"EXAMPLEKEY", https:true, ssl:{key: privateKey, cert: certificate}, staticPath:__dirname+'/views/teste'})

lti.appUrl('/')
lti.loginUrl('/login')


lti.registerPlatform("http://localhost/moodle", "Moodle", "1W8pk8LRuvB1DtO", "http://localhost/moodle/mod/lti/auth.php", 'http://localhost/moodle/mod/lti/token.php',{method: "JWK_SET", key: "http://localhost/moodle/mod/lti/certs.php"})



let plat = lti.getPlatform("http://localhost/moodle")

//console.log(plat.platformPublicKey())


//console.log(a = new Date(Date.now()).toISOString())

lti.deploy().onConnect((connection, request, response, next)=>{
    //console.log(connection['https://purl.imsglobal.org/spec/lti/claim/custom'].teste)
    response.sendFile(__dirname+'/views/teste/dist/index.html')
    lti.messagePlatform(connection)
},{maxAge: 1000*1})









/* state n stuff */