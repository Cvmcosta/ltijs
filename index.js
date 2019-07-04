// Install moodle for testing
// Test for apache2 and php and mysql

const fs = require('fs')
const path = require('path')

const Lti = require('./main').Provider

const privateKey = fs.readFileSync('./ssl/server.key', 'utf8')
const certificate = fs.readFileSync('./ssl/server.cert', 'utf8')

const lti = new Lti('EXAMPLEKEY', { url: 'mongodb://localhost/tests' }, { https: true, ssl: { key: privateKey, cert: certificate }, staticPath: path.join(__dirname, '/views/teste') })

let setup = async () => {
  lti.appUrl('/')
  lti.loginUrl('/login')

  lti.deploy()
  lti.onConnect((connection, request, response) => {
    response.sendFile(path.join(__dirname, '/views/teste/dist/index.html'))

    let grade = {
      timestamp: new Date(Date.now()).toISOString(),
      scoreGiven: 60,
      comment: 'This is exceptional work.',
      activityProgress: 'Completed',
      gradingProgress: 'FullyGraded',
      userId: connection.sub
    }
    lti.messagePlatform(connection, grade)
  }, { maxAge: 1000, secure: true })

  let plat = await lti.registerPlatform('http://localhost/moodle', 'Educsaite', '1W8pk8LRuvB1DtO', 'http://localhost/moodle/mod/lti/auth.php', 'http://localhost/moodle/mod/lti/token.php', { method: 'JWK_SET', key: 'http://localhost/moodle/mod/lti/certs.php' })

  let key = await plat.platformPublicKey()
  console.log(key)
}
setup()
