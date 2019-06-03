//Install moodle for testing
//Test for apache2 and php and mysql



const Lti = require("./main").Provider
const lti = new Lti('1.3', "EXAMPLEKEY")

/* 
lti.registerPlatform("Moodle", "http://localhost/moodle","1W8pk8LRuvB1DtO", "http://localhost/moodle/mod/lti/auth.php")
let plat = lti.getPlatform("Moodle")
console.log(plat)
//lti.deletePlatform("Moodle") 
*/


lti.setAppUrl('/')
lti.setLoginUrl('/login')

lti.deploy()

lti.server.post('/', (req, res)=>{
    console.log("\nID_TOKEN >>> ")
    console.log(res.locals.id_token)
})