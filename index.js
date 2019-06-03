//Install moodle for testing
//Test for apache2 and php and mysql
const Lti = require("./main").Provider

const lti = new Lti('1.3')

//lti.registerPlatform("Moodle", "1W8pk8LRuvB1DtO", "http://localhost/moodle/mod/lti/auth.php")

lti.getPlatform("Moodle")

//lti.deletePlatform("Moodle")

//lti.deploy()