//Install moodle for testing
//Test for apache2 and php and mysql
const Lti = require("./main").Provider

const lti = new Lti()
lti.listen(3000)
