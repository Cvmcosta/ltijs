const path = require('path')
 
// Require Provider
const lti = require('ltijs').Provider
 
// Setup provider
lti.setup('PASMADEUPKEY8123$', // Key used to sign cookies and tokens
  { // Database configuration
    url: 'mongodb+srv://ltijs-dev.w5pfd.mongodb.net/?retryWrites=true&w=majority',
    connection: { user: 'lti', pass: 'oRUY12TydPS4CQtC' }
  },
  { // Options
    appRoute: '/', loginRoute: '/login', // Optionally, specify some of the reserved routes
    cookies: {
      secure: false, // Set secure to true if the testing platform is in a different domain and https is being used
      sameSite: '' // Set sameSite to 'None' if the testing platform is in a different domain and https is being used
    },
    devMode: true // Set DevMode to false if running in a production environment with https
  }
)
 
// Set lti launch callback
lti.onConnect((token, req, res) => {
  console.log(token)
  return res.send('It\'s alive!')
})
 
const setup = async () => {
  // Deploy server and open connection to the database
  await lti.deploy({ port: 8080 }) // Specifying port. Defaults to 3000
 
  // Register platform
  await lti.registerPlatform({
    url: 'https://ltijs-dan.peregrineglobal.com',
    name: 'Ltc-ltijs-dev-env ',
    clientId: 'TOOLCLIENTID',
    authenticationEndpoint: 'https://ltijs-dan.peregrineglobal.com/auth',
    accesstokenEndpoint: 'https://ltijs-dan.peregrineglobal.com/token',
    authConfig: { method: 'JWK_SET', key: 'https://ltijs-dan.peregrineglobal.com/keyset' }
  })
}
 
setup()