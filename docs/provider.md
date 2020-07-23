<div align="center">
	<br>
	<br>
	<a href="https://cvmcosta.github.io/ltijs"><img width="360" src="logo-300.svg"></img></a>
  <a href="https://site.imsglobal.org/certifications/coursekey/ltijs"​ target='_blank'><img width="80" src="https://www.imsglobal.org/sites/default/files/IMSconformancelogoREG.png" alt="IMS Global Certified" border="0"></img></a>
</div>



> Easily turn your web application into into a LTI 1.3 Learning Tool.


[![travisci](https://travis-ci.org/Cvmcosta/ltijs.svg?branch=master)](https://travis-ci.org/Cvmcosta/ltijs)
[![codecov](https://codecov.io/gh/Cvmcosta/ltijs/branch/master/graph/badge.svg)](https://codecov.io/gh/Cvmcosta/ltijs)
[![Node Version](https://img.shields.io/node/v/ltijs.svg)](https://www.npmjs.com/package/ltijs)
[![NPM package](https://img.shields.io/npm/v/ltijs.svg)](https://www.npmjs.com/package/ltijs)
[![NPM downloads](https://img.shields.io/npm/dm/ltijs)](https://www.npmjs.com/package/ltijs)
[![dependencies Status](https://david-dm.org/cvmcosta/ltijs/status.svg)](https://david-dm.org/cvmcosta/ltijs)
[![devDependencies Status](https://david-dm.org/cvmcosta/ltijs/dev-status.svg)](https://david-dm.org/cvmcosta/ltijs?type=dev)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![APACHE2 License](https://img.shields.io/github/license/cvmcosta/ltijs)](#LICENSE)
[![Donate](https://img.shields.io/badge/Donate-Buy%20me%20a%20coffe-blue)](https://www.buymeacoffee.com/UL5fBsi)


Please ⭐️ us on [GitHub](https://github.com/Cvmcosta/ltijs), it always helps! 

> [Ltijs is LTI Advantage Complete Certified by IMS](https://site.imsglobal.org/certifications/coursekey/ltijs)

> Ltijs version 5.0 is a re-release of the project as a Certified LTI library, that comes with many improvements and new functionalities and a few **API changes**, see bellow for a migration guide from version 4.0 and a complete list of the changes made:
> - [Migrating from version 4](https://cvmcosta.github.io/ltijs/#/migration)
> - [CHANGELOG](https://cvmcosta.github.io/ltijs/#/changelog)

## Table of Contents

- [Introduction](#introduction)
- [Feature roadmap](#feature-roadmap)
- [Installation](#installation)
- [Quick start](#quick-start)
- [Documentation](#documentation)
- [Usage](#usage)
  - [Setting up provider](#setting-up-provider)
  - [Using the keyset endpoint](#keyset-endpoint)
  - [The Provider object](#the-provider-object)
  - [Serving static files](#serving-static-files)
  - [Deploy and the onConnect() Callback](#deploy)
  - [Keyset Endpoint](#keyset-endpoint)
  - [Server addon support](#server-addon-support)
  - [The Platform object](#the-platform-object)
  - [The idToken object](#the-idtoken-object)
  - [Routing and Context](#routing-and-context)
- [Deep Linking with Ltijs](#deep-linking-with-ltijs)
- [Sending and retrieving grades with Ltijs](#sending-grades-with-ltijs)
- [Using the Names and Roles service with Ltijs](#the-names-and-roles-provisioning-service)
- [Debugging](#debugging)
- [Contributing](#contributing)
- [Special thanks](#special-thanks)
- [License](#license)

---

## Introduction

The Learning Tools Interoperability (LTI) protocol is a standard for integration of rich learning applications within educational environments. <sup>[ref](https://www.imsglobal.org/spec/lti/v1p3/)</sup>


This library implements a tool provider as an [Express](https://expressjs.com/) server, with preconfigured routes and methods that manage the [LTI 1.3](https://www.imsglobal.org/spec/lti/v1p3/) protocol for you. Making it fast and simple to create a working learning tool with access to every LTI service, without having to worry about manually implementing any of the security and validation required to do so. 

---


## Feature roadmap

| Feature | Implementation | Documentation |
| --------- | - | - |
| [Keyset endpoint support](https://cvmcosta.me/ltijs/#/provider?id=keyset-endpoint) | <center>✔️</center> | <center>✔️</center> |
| [Deep Linking Service Class](https://cvmcosta.me/ltijs/#/deeplinking) | <center>✔️</center> | <center>✔️</center> |
| [Grading Service Class](https://cvmcosta.me/ltijs/#/grading) | <center>✔️</center> | <center>✔️</center> |
| [Names and Roles Service Class](https://cvmcosta.me/ltijs/#/namesandroles) | <center>✔️</center> | <center>✔️</center> |
| Database plugins | <center>✔️</center> | <center>✔️</center> |
| Key Rotation | <center></center> | <center></center> |
| Redis caching | <center></center> | <center></center> |


---



## Installation

### Installing the package

```shell
$ npm install ltijs
```


### MongoDB

This package natively uses mongoDB by default to store and manage the server data, so you need to have it installed, see link bellow for further instructions.

  - [Installing mongoDB](https://docs.mongodb.com/manual/administration/install-community/)


### Database Plugins

Ltijs can also be used with other databases through database plugins that use the same structure as the main database class.

  -  [Sequelize Plugin](https://github.com/Cvmcosta/ltijs-sequelize)(MySQL, PostgreSQL)


---

## Quick start


> Setting up Ltijs



```javascript
const path = require('path')

// Require Provider 
const lti = require('ltijs').Provider

// Setup provider
lti.setup('LTIKEY', // Key used to sign cookies and tokens
         { url: 'mongodb://localhost/database' }, // Database configuration
         { appRoute: '/', loginRoute: '/login' }) // Optionally, specify some of the reserved routes

// Set lti launch callback
lti.onConnect((token, req, res) => {
  console.log(token)
  return res.send('It\'s alive!')
})

const setup = async () => {
  // Deploy server and open connection to the database
  await lti.deploy({ port: 3000 }) // Specifying port. Defaults to 3000

  // Register platform
  await lti.registerPlatform({ 
    url: 'https://platform.url',
    name: 'Platform Name',
    clientId: 'TOOLCLIENTID',
    authenticationEndpoint: 'https://platform.url/auth',
    accesstokenEndpoint: 'https://platform.url/token',
    authConfig: { method: 'JWK_SET', key: 'https://platform.url/keyset' }
  })
}

setup()
```

---

## Documentation

### Provider
>The Ltijs Provider Class implements the LTI 1.3 protocol and services.


#### Provider.app
[Express](https://expressjs.com/) server instance.

**Type**: ```Express```


#### Provider.Database
Database object. Allows you to perform the database operations using the same methods used by the internal code.

**Type**: ```Database```  


#### Provider.Grade
[Grade Class](https://cvmcosta.github.io/ltijs/#/grading), implementing the Assignment and Grade service of the LTI 1.3 protocol.

**Type**: ```Grade```

#### Provider.DeepLinking
[DeepLinking Class](https://cvmcosta.github.io/ltijs/#/deeplinking), implementing the Deep Linking service of the LTI 1.3 protocol.

**Type**: ```DeepLinking```

#### Provider.NamesAndRoles
[NamesAndRoles Class](https://cvmcosta.github.io/ltijs/#/namesandroles), implementing the Names and Roles Provisioning service of the LTI 1.3 protocol.

**Type**: ```NamesAndRoles```

#### Provider.setup(encryptionkey, database [, options]) 

Method used to setup and configure the LTI provider.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| encryptionkey | `String`  | Secret used to sign cookies and encrypt data. | &nbsp; |
| database | `Object`  | Database configuration. | |
| database.url | `String`  | Database url (Ex: mongodb://localhost/applicationdb). |  |
| database.connection | `Object`  | MongoDB database connection options. Can be any option supported by the [MongoDB Driver](http://mongodb.github.io/node-mongodb-native/2.2/api/MongoClient.html#connect). | *Optional* |
| database.connection.user | `String`  | Database user for authentication, if needed. | *Optional* |
| database.connection.pass | `String`  | Database pass for authentication, if needed. | *Optional* |
| database.debug | `Boolean`  | If set to true, enables mongoose debug mode. **Default: false**. | *Optional* |
| database.plugin | `Object`  | If set, uses the given database plugin instead of the default MongoDB. | *Optional* |
| options | `Object`  | LTI Provider options. | *Optional* |
| options.appRoute | `String`  | Lti Provider main url. **Default: '/'**. | *Optional* |
| options.loginRoute | `String`  | Lti Provider login url. **Default: '/login'**. | *Optional* |
| options.keysetRoute | `String`  | Lti Provider public jwk keyset route. **Default: '/keys'**. | *Optional* |
| options.sessionTimeoutRoute | `String`  | Lti Provider session timeout url. **Default: '/sessiontimeout'**. | *Optional* |
| options.invalidTokenRoute | `String`  | Lti Provider invalid token url. **Default: '/invalidtoken'**. | *Optional* |
| options.https | `Boolean`  |  Set this as true in development if you are not using any web server to redirect to your tool (like Nginx) as https and are planning to configure ssl through Express. **Default: false**. | *Optional* |
| options.ssl | `Object`  | SSL certificate and key to be used ***if https flag is enabled.*** | *Optional* |
| options.ssl.key | `String`  | SSL key. | *Optional* |
| options.ssl.cert | `String`  | SSL certificate. | *Optional* |
| options.staticPath | `String`  | The path for the static files your application might serve (Ex: _dirname+"/public") | *Optional* |
| options.cors | `Boolean`  | If set to false, disables cors. **Default: true**. | *Optional* |
| options.serverAddon | `Function` |  Allows the execution of a method inside of the server contructor. Can be used to register middlewares. | *Optional* |
| options.cookies | `Object` | Cookie configuration. Allows you to configure, sameSite and secure parameters. | *Optional* |
| options.cookies.secure | `Boolean` | Cookie secure parameter. If true, only allows cookies to be passed over https. **Default: false**. | *Optional* |
| options.cookies.sameSite | `String` | Cookie sameSite parameter. If cookies are going to be set across domains, set this parameter to 'None'. **Default: Lax**. | *Optional* |
| options.devMode | `Boolean` | If true, does not require state and session cookies to be present (If present, they are still validated). This allows Ltijs to work on development environments where cookies cannot be set. **Default: false**. ***THIS SHOULD NOT BE USED IN A PRODUCTION ENVIRONMENT.*** | *Optional* |
| options.tokenMaxAge | `String` | Sets the idToken max age allowed in seconds. If false, disables max age validation. **Default: 10**. | *Optional* |

#### async Provider.deploy(options) 

Starts listening to a given port for LTI requests and opens connection to the configured database.


##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| options | `Object`  | Deployment options. | *Optional* |
| options.port | `Number`  | The port the Provider should listen to. **Default: 3000**. | *Optional* |
| options.silent | `Boolean`  | If true, supresses the deployment messages. **Default: false**. | *Optional* |
| options.serverless | `Boolean`  | If true, Ltijs does not start an Express server instance. This allows usage as a middleware and with services like AWS. Ignores 'port' parameter. **Default: false**. | *Optional* |

##### Returns

- Promise that resolves ```true``` when connection to the database is stablished and the server starts listening.




#### async Provider.close() 

Closes connection to database and stops server.

##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| options | `Object`  | Options. | *Optional* |
| options.silent | `Boolean`  | If true, disables shutdown messages. **Default: false**. | *Optional* |


##### Returns

- Promise that resolves ```true``` when the shutdown is complete.



#### Provider.onConnect(connectCallback) 

Sets the callback method called whenever theres a sucessfull connection, exposing a token object containing the decoded idToken and the usual Express route parameters (Request, Response and Next).




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| connectCallback | `Function`  | Callback method called everytime a platform sucessfully launches to the provider main endpoint. | &nbsp; |





##### Examples

```javascript
lti.onConnect(async (token, req, res, next) => { return res.send(token) })
```

*The default method set to this callback simply fowards the request to the next handler, so the usage of onConnect is optional:*

```javascript
// Equivalent to onConnect usage above
lti.app.get(lti.appRoute(), async (req, res, next) => { return res.send(res.locals.token) })
```


#### Provider.onDeepLinking(deepLinkingCallback) 

Sets the callback method called whenever theres a sucessfull deep linking request connection, exposing a token object containing the decoded idToken and the usual Express route parameters (Request, Response and Next). Through this callback you can display your Deep Linking view.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| deepLinkingCallback | `Function`  | Callback method called everytime a platform sucessfully launches a deep linking request. | &nbsp; |





##### Examples

```javascript
lti.onDeepLinking(async (token, req, res, next) => { return res.send(token) })
```

#### Provider.onSessionTimeout(sessionTimeoutCallback) 

Sets the callback method called when no valid session is found during a request validation.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| sessionTimeoutCallback | `Function`  |  Callback method called when no valid session is found during a request validation. | &nbsp; |





##### Examples

```javascript
lti.onSessionTimeout(async (req, res, next) => { return res.status(401).send('SESSION_TIMEOUT. Please reinitiate login.') })
```

*Ltijs provides a default method for this callback.*


#### Provider.onInvalidToken(invalidTokenCallback) 

Sets the callback method called when the token received fails the validation process.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| invalidTokenCallback | `Function`  |  Callback method called when the token received fails the validation process. | &nbsp; |





##### Examples

```javascript
lti.onInvalidToken(async (req, res, next) => { return res.status(401).send('INVALID_TOKEN. Please reinitiate login.') })
```

*Ltijs provides a default method for this callback.*



#### Provider.appRoute() 

Gets the main application Route that will receive the final decoded Idtoken.





##### Examples

```javascript
lti.appRoute()
```



#### Provider.loginRoute() 

Gets the login Route responsible for dealing with the OIDC login flow.



##### Examples

```javascript
lti.loginRoute()
```




#### Provider.sessionTimeoutRoute() 

Gets the session timeout Route that will be called whenever the system encounters a session timeout.



##### Examples

```javascript
lti.sessionTimeoutRoute()
```




#### Provider.invalidTokenRoute() 

Gets the invalid token Route that will be called whenever the system encounters a invalid token or cookie.





##### Examples

```javascript
lti.invalidTokenRoute()
```




#### Provider.keysetRoute() 

Gets the public JWK keyset Route.





##### Examples

```javascript
lti.keysetRoute()
```

#### Provider.whitelist(urls)
Whitelists routes to bypass the lti 1.3 authentication protocol. If they fail validation, these routes are still accessed but aren't given an idToken.



| Param | Type | Description |
| --- | --- | --- |
| urls | <code>String</code> | Urls to be whitelisted. Optionally you can pass an object containing the route and the specific method. |

##### Examples

```javascript
// Whitelisting routes
lti.whitelist('/log', '/home')

// Whitelisting routes with specific methods
lti.whitelist('/log', '/home', { route: '/route', method: 'POST' })
```



#### async Provider.registerPlatform(platform) 

Registers a new [Platform](platform.md).


##### Parameters

| Param | Type | Description |  |
| --- | --- | --- | --- |
| platform | <code>Object</code> | Platform config object | &nbsp; |
| platform.url | <code>String</code> | Platform url. | &nbsp; |
| platform.name | <code>String</code> | Platform nickname. | &nbsp; |
| platform.clientId | <code>String</code> | Client Id generated by the platform. | &nbsp; |
| platform.authenticationEndpoint | <code>String</code> | Authentication endpoint that the tool will use to authenticate within the platform. | &nbsp; |
| platform.accesstokenEndpoint | <code>String</code> | Access token endpoint that the tool will use to get an access token for the platform. | &nbsp; |
| platform.authConfig | <code>Object</code> | Authentication method and key for verifying messages from the platform. {method: "RSA_KEY", key:"PUBLIC KEY..."} | &nbsp; |
| platform.authConfig.method | <code>String</code> | Method of authorization "RSA_KEY" or "JWK_KEY" or "JWK_SET". | &nbsp; |
| platform.authConfig.key | <code>String</code> | Either the RSA public key provided by the platform, or the JWK key, or the JWK keyset address.| &nbsp; |




##### Returns


 - Promise that resolves a [Platform](platform.md).


##### Example

```javascript
await lti.registerPlatform({ 
  url: 'https://platform.url',
  name: 'Platform Name',
  clientId: 'TOOLCLIENTID',
  authenticationEndpoint: 'https://platform.url/auth',
  accesstokenEndpoint: 'https://platform.url/token',
  authConfig: { method: 'JWK_SET', key: 'https://platform.url/keyset' }
})
```



#### async Provider.getPlatform(url, clientId) 

Retrieves a [Platform](platform.md).




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| url | `String`  | Platform url. | &nbsp; |
| clientId | `String`  | Tool Client Id url. | &nbsp; |




##### Returns


- Promise that resolves a [Platform](platform.md).


##### Example

```javascript
const plat = await lti.getPlatform('https://platform.url', 'TOOLCLIENTID')
```


#### async Provider.deletePlatform(url) 

Deletes a [Platform](platform.md).



##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| url | `String`  | Platform url. | &nbsp; |
| clientId | `String`  | Tool Client Id url. | &nbsp; |


##### Returns

- Promise that resolves ```true```.

##### Example

```javascript
await lti.deletePlatform('https://platform.url', 'TOOLCLIENTID')
```


#### async Provider.getAllPlatforms() 

Gets all [platforms](platform.md).



##### Returns

- Promise that resolves a [Platform](platform.md) object array.


##### Example

```javascript
const platforms = await lti.getAllPlatforms()
```


#### async Provider.redirect(response, path [, options]) 

Redirects to a new location. Passes Ltik if present.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| response | `Object`  | Espress response object.| &nbsp; |
| path | `String`  | Redirect path. | &nbsp; |
| [options] | <code>Object</code> |  Redirection options | *Optional* |
| [options.isNewResource] | <code>Boolean</code> | If true, changes the path variable on the context token. | *Optional* |

**Example**  
```js
lti.redirect(res, '/path', { isNewResource: true })
```

---

## Setting up Ltijs

When using Ltijs, the first step must **always** be to call the `setup` method to configure the LTI provider:

```javascript
// Require Ltijs package
const lti = require('ltijs').Provider

// Setup provider example
lti.setup('EXAMPLEKEY', 
          { 
            url: 'mongodb://localhost/database',// Database url
            connection:{ user:'user', pass: 'pass'}// Database configuration
          }, 
          { 
            appRoute: '/app',// Scpecifying main app route
            loginRoute: '/login', // Specifying login route
            cookies: {
              secure: true, // Cookies will only be passed through https.
              sameSite: 'None' // Cookies can be set across domains.
            }
          })
```

This method receives three arguments **encryptionkey**, **database** and **options**:

### Encryption Key:

The **encryptionkey** parameter receives a string that will be used as a secret to sign the cookies set by Ltijs and encrypt some of the database information, such as access token or private keys.

### Database configuration:

The second parameter of the setup method, **database**, is an object with: 

- An `url` field, that should be the **database connection url**;

- An optional `connection` field, that can contain any of the [MongoDB Driver's connection options](http://mongodb.github.io/node-mongodb-native/2.2/api/MongoClient.html#connect), such as authentication information `user` and `pass`;

- A `debug` field that if set to true enables Mongoose's debug mode;

- And a `plugin` field used for database plugins, such as [ltijs-sequelize](https://github.com/Cvmcosta/ltijs-sequelize).


### Options:

The third parameter, **options**, is an optional parameter that handles the additional provider configuration:

#### Reserved endpoint configuration:
  
Through the **options** parameter you can specify the routes for the reserved endpoints used by Ltijs:

- **appRoute** - Route used to handle successful launch requests through the `onConnect` callback. **Default: '/'**.

- **loginRoute** - Route used to handle the initial OIDC login flow. **Default: '/login'**.

- **keysetRoute** - Route used serve the tool's JWK keyset. **Default: '/keys'**.

- **invalidTokenRoute** - Route used to handle invalid token errors. **Default: '/invalidtoken'**.

- **sessionTimeoutRoute** - Route used to handle session timeout errors. **Default: '/sessiontimeout'**.

```javascript
// Setup provider example
lti.setup('EXAMPLEKEY', 
          { 
            url: 'mongodb://localhost/database',// Database url
            connection:{ user:'user', pass: 'pass'}// Database configuration
          }, 
          { 
            appRoute: '/app',// Scpecifying main app route
            loginRoute: '/loginroute', // Specifying login route
            keysetRoute: '/keyset', // Specifying keyset route
            invalidTokenRoute: '/invalidtokenroute', // Specifying invalid token route
            sessionTimeoutRoute: '/sessiontimeoutroute' // Specifying session timeout route
          })
```

#### Cookie configurations:

Ltijs sets session cookies throughout the LTI validation process, how these cookies are set can be configured through the `cookies` field of the **options** parameter:

- **secure** - Determines if the cookie can only be sent through **https**. **Default: false**.

- **sameSite** - Determines if the cookie can be sent cross domain. **Default: Lax**.

```javascript
// Setup provider example
lti.setup('EXAMPLEKEY', 
          { 
            url: 'mongodb://localhost/database',// Database url
            connection:{ user:'user', pass: 'pass'}// Database configuration
          }, 
          { 
            cookies: { // Cookie configuration
              secure: true,
              sameSite: 'None'
            }
          })
```

***If sameSite is defined as 'None', the secure flag is automatically set to true, that is done because browsers do not accept cookies with sameSite set to 'None' that are not also set as secure.***

#### Development mode:

Ltijs relies on the set cookies for part of the validation process, but in some development environments, cookies mught not be able to be set, for instance if you are trying to set cross domain cookies over an insecure http connection. 

In situations like this you can set the `devMode` field as true and Ltijs will stop trying to validate the cookies and will instead use the information obtained through the `Ltik` token to retrieve the correct context information.

```javascript
// Setup provider example
lti.setup('EXAMPLEKEY', 
          { 
            url: 'mongodb://localhost/database',// Database url
            connection:{ user:'user', pass: 'pass'}// Database configuration
          }, 
          { 
            devMode: true // Using development mode
          })
```

***DevMode should never be used in a production environment, and it should not be necessary, since most of the cookie issues can be solved by using the "secure: true" and "sameSite: None" flags.***

#### Token max age allowed:

As part of the LTI 1.3 protocol validation steps, Ltijs checks the idtoken's `iat` claim and flags the token as invalid if it is older than **10 seconds**. 

This limit can be configured (or removed) through the `tokenMaxAge` field:

- **tokenMaxAge** - Sets the idToken max age allowed in seconds. If **false**, disables max age validation. **Default: 10**.

```javascript
// Setup provider example
lti.setup('EXAMPLEKEY', 
          { 
            url: 'mongodb://localhost/database',// Database url
            connection:{ user:'user', pass: 'pass'}// Database configuration
          }, 
          { 
            tokenMaxAge: 60 // Setting maximum token age as 60 seconds
          })
```

#### Server addon:

Through the `serverAddon` field you can setup a method that will be executed on the moment of the server creation. This method will receive the `Express` app as a parameter and so it can be used to register middlewares or change server configuration:


```javascript
// Creating middleware registration
const middleware = (app) => {
  app.use(async (req, res, next) => {
    console.log('Middleware works!')
    next() // Passing to next handler
  })
}

//Configure provider
lti.setup('EXAMPLEKEY', 
            { url: 'mongodb://localhost/database', 
              connection:{ user:'user',
                          pass: 'pass'} 
            }, 
            {  
              serverAddon: middleware // Setting addon method
            }) 
```

***Registered middlewares need to call `next()`, otherwise no other handler will be reached.***


#### Serving static files:

`Express` allows us to specify a path from where static files will be served.

Ltijs can use this functionality by setting the staticPath parameter of the constructor's additional options. 

```javascript
//Configure provider
lti.setup('EXAMPLEKEY', 
            { url: 'mongodb://localhost/database', 
              connection:{ user:'user',
                          pass: 'pass'} 
            }, 
            { 
              staticPath: path.join(__dirname, 'public') // Setting static path
            })
```

#### Cors:

Ltijs `Express` instance is configured to accept cross origin requests by default, this can be disabled by setting the `cors` field to **false**:

```javascript
//Configure provider
lti.setup('EXAMPLEKEY', 
            { url: 'mongodb://localhost/database', 
              connection:{ user:'user',
                          pass: 'pass'} 
            }, 
            { 
              cors: false // Disabling cors
            })
```

## Using Ltijs

After the `setup` method is called Ltijs gives you access to objects and methods to help you create your LTI Provider:

### App

The `lti.app` object is an instance of the underlying `Express` server, through this object you can create routes just like you would when using regular [Express](https://expressjs.com/).

```javascript
lti.app.get('/route', async (req,res,next) => {
  return res.send('It works!')
})
```

### Reserved endpoint routes

Ltijs reserved endpoint routes can be retrieved by using the following methods:

- **lti.appRoute**

  ```javascript
  const appRoute = lti.appRoute() // returns '/' by default
  ```

- **lti.loginRoute**

  ```javascript
  const loginRoute = lti.loginRoute() // returns '/login' by default
  ```
- **lti.keysetRoute**

  ```javascript
  const keysetRoute = lti.keysetRoute() // returns '/keys' by default
  ```

- **lti.sessionTimeoutRoute**

  ```javascript
  const sessionTimeoutRoute = lti.sessionTimeoutRoute() // returns '/sessiontimeout' by default
  ```

- **lti.invalidTokenRoute**

  ```javascript
  const invalidTokenRoute = lti.invalidTokenRoute() // returns '/invalidtoken' by default
  ```


### Callbacks

Ltijs allows you to configure it's main behaviours through callbacks:

#### onConnect

The `onConnect` callback is called whenever a successful launch request arrives at the main app url. This callback can be set through the `lti.onConnect()` method. 

The callback route will be given a first parameter `token`, that is the user's validated [idtoken](#idtoken), and the three Express route parameters (request, response and next).

> The **[idtoken](#idtoken)** can also be found in the **response.locals.token** object.

```javascript
lti.onConnect(async (token, req, res, next) => {
    console.log(token)
    return res.send('User connected!')
  }
)
```

*The default method set to this callback simply fowards the request to the next handler, so the usage of `lti.onConnect()` is optional, you can simply create a route receiving requests at the `appRoute`:*

```javascript
// Equivalent to onConnect usage above
lti.app.get(lti.appRoute(), async (req, res, next) => {
    console.log(res.locals.token)
    return res.send('User connected!') 
  }
)
```

#### onDeepLinking

The `onDeepLinking` callback is called whenever a successfull deep linking request arrives at the main app url. This callback can be set through the `lti.onDeepLinking()` method. 

The callback route will be given a first parameter `token`, that is the user's validated [idtoken](#idtoken), and the three Express route parameters (request, response and next).

> *This callback should be used to display your **LTI provider's deep linking UI**.*

```javascript
lti.onDeepLinking(async (token, req, res, next) => {
    return res.send('Deep Linking is working!')
  }
)
```

> [See more about the Deep Linking Service](https://cvmcosta.me/ltijs/#/deeplinking)


#### onInvalidToken

The `onInvalidToken` callback is called whenever the idtoken received fails the LTI validation process. This callback can be set through the `lti.onInvalidToken()` method.

The callback route will be given the three Express route parameters (request, response and next).

> *This callback should be used to display your **invalid token error screen**.*

```javascript
lti.onInvalidToken(async (req, res, next) => { 
    return res.status(401).send('INVALID_TOKEN. Please reinitiate login.') 
  }
)
```
*Ltijs provides a default method for this callback that returns a 401 error code with a simple error message.*

#### onSessionTimeout

The `onSessionTimeout` callback is called whenever no valid session is found during a request validation. This callback can be set through the `lti.onSessionTimeout()` method.

The callback route will be given the three Express route parameters (request, response and next).

> *This callback should be used to display your **session timeout error screen**.*

```javascript
lti.onSessionTimeout(async (req, res, next) => { 
    return res.status(401).send('SESSION_TIMEOUT. Please reinitiate login.') 
  }
)
```
*Ltijs provides a default method for this callback that returns a 401 error code with a simple error message.*



### Deploy

Deploying the application opens a connection to the configured database and starts the Express server.

```javascript
await lti.deploy()
```


The `lti.deploy()` method accepts an `options` object with the following fields:

- **port** - Determines the port used by the Express server. **Default: 3000**.

- **silent** - If set to true, supresses deployment messages. **Default: false**.

- **serverless** - If set to true, Ltijs does not start the Express server. **Default: false**.


```javascript
await lti.deploy({ port: 3030, silent: false })
```

<div align="center">
  </br>
	<img width="300" src="deploy.png"></img>
  <div><sub>Deployment message</sub></div>
  </br>
</div>


#### Deploying Ltijs as part of another server

You can use Ltijs as a middleware by calling the deploy method with the serverless flag set to true. *Theoretically this also allows you to use Ltijs with AWS or other similar services.*

```javascript
const app = express()
lti.setup('EXAMPLEKEY', { url: 'mongodb://localhost/database' })

// Start LTI provider in serverless mode
await lti.deploy({ serverless: true })

// Mount Ltijs express app into preexisting express app with /lti prefix
app.use('/lti', lti.app)
```


---

### Platform

A LTI tool works in conjunction with an LTI ready platform, so in order for a platform to display your tool's resource, it needs to first be registered in the tool provider.

> [Check the Platform Class Documentation](platform.md)

#### Registering a new Platform

The`lti.registerPlatform()` method returns a Promise that resolves the created [Platform](platform.md) object.

```javascript
let plat = await lti.registerPlatform({ 
    url: 'https://platform.url',
    clientId: 'TOOLCLIENTID',
    name: 'Platform Name',
    authenticationEndpoint: 'https://platform.url/auth',
    accesstokenEndpoint: 'https://platform.url/token',
    authConfig: { method: 'JWK_SET', key: 'https://platform.url/keyset' }
})
```

**url:** Platform url.

**clientId:** Tool client Id generated by the Platform.


**name:** Platform name.


**authenticationEndpoint:** Platform authentication endpoint.

**accesstokenEndpoint:** Platform access token request endpoint.

**authConfig:** Platform idtoken authentication method.

- If the platform uses a JWK keyset

```javascript
authConfig: { method: 'JWK_SET', key: 'https://platform.url/keyset' }
```


- If the platform uses a JWK key

```javascript
authConfig: { method: 'JWK_KEY', 
              key: 
                '{"kty":"EC",
                  "crv":"P-256",
                  "x":"f83OJ3D2xF1Bg8vub9tLe1gHMzV76e8Tus9uPHvRVEU",
                  "y":"x_FEzRu9m36HLN_tue659LNpXW6pCyStikYjKIWI5a0",
                  "kid":"keyid"
                }'}
```


- If the platform uses a RSA key

```javascript
authConfig: { method: 'RSA_KEY', 
              key: '-----BEGIN PUBLIC KEY-----\n'+
                  'MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCqGKukO1De7zhZj6+H0qtjTkVxwTCpvKe4eCZ0\n'+
                  'FPqri0cb2JZfXJ/DgYSF6vUpwmJG8wVQZKjeGcjDOL5UlsuusFncCzWBQ7RKNUSesmQRMSGkVb1/\n'+
                  '3j+skZ6UtW+5u09lHNsj6tQ51s1SPrCBkedbNf0Tp0GbMJDyR4e9T04ZZwIDAQAB\n'+
                  '-----END PUBLIC KEY-----' }
```

#### Retrieving a Platform

Registered platforms can be retrieved using the following methods:

**lti.getPlatform:**

The `lti.getPlatform()` method receives two arguments, `platformUrl` and `clientId`, and returns a Promise that resolves a [Platform](platform.md) object.

``` javascript
const plat = await lti.getPlatform('http://plat.com', 'CLIENTID') // Returns Platform object
```

*If no **clientId** is passed, this method will return an array containing every [Platform](platform.md) object that shares the given **platformUrl**.*

``` javascript
const plats = await lti.getPlatform('http://plat.com') // Returns Platform Array
```

**lti.getAllPlatforms:**

The `lti.getAllPlatforms()` method returns a Promise that resolves an Array containing every registered [Platform](platform.md).

```javascript
const platforms = await lti.getAllPlatforms() // Returns every registered platform
```

#### Modifying a Platform

After a platform is registered, it's **authenticationEndpoint**, **accesstokenEndpoint** and **authConfig** parameter can still be modified in two ways:

**Using Platform object:**

The Platform object gives you methods to retrieve and modify platform configuration.

> [Check the Platform Class Documentation](platform.md)


**Registration method:**

If the platform is already registered and you pass different values for the parameters when calling the `lti.registerPlatform()` method, the configuration of the registered platform will be updated.

*platformUrl and cliendId have to be passed and cannot be changed.*

```javascript
let plat = await lti.registerPlatform({ 
    url: 'https://platform.url',
    clientId: 'TOOLCLIENTID',
    name: 'Platform Name 2', // Changing the name of already registered platform
})
```

#### Deleting a Platform

Registered platforms can be deleted using the `lti.deletePlatform()` method. 

This method receives two arguments, `platformUrl` and `clientId`:

``` javascript
await lti.deletePlatform('http://plat.com', 'CLIENTID') // Deletes a platform
```

---

### The IdToken object

When using the LTI 1.3 protocol, every successful login between tool and platform generates an **IdToken** thet the tool uses to identify the user as well as the context in which the login request was realized in.

Everytime a login request or call to route is sucessfully validated, either by validating the idtoken received according to the [LTI 1.3 security specifications](https://www.imsglobal.org/spec/security/v1p0/), or retrieving the session cookie generated when the idtoken validation is completed, a **IdToken** object is passed to the application inside the **res.locals.token** property of the Express route function.

```javascript
lti.app.get('/route', (req, res) => {
  console.log(res.locals.token)
})
```


The token consists of: 

```javascript
{
  iss: 'http://path/to/platform',
  issuer_code: 'platformCode',
  user: '2', // User id
  roles: [
    'http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator',
    'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor',
    'http://purl.imsglobal.org/vocab/lis/v2/system/person#Administrator'
  ],
  userInfo: {
    given_name: 'User Given Name',
    family_name: 'Use Family Name',
    name: 'User Full Name',
    email: 'user@email.com'
  },
  platformInfo: {
    family_code: 'platform_type', // ex: Moodle
    version: 'versionNumber',
    name: 'LTI',
    description: 'LTI tool'
  },
  endpoint: {
    scope: [ // List of scopes
      'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
      'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly',
      'https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly',
      'https://purl.imsglobal.org/spec/lti-ags/scope/score'
    ],
    lineitems: 'http://platform/lineitems/url',
    lineitem: ''
  },
  namesRoles: {
    context_memberships_url: 'http://platform/context/membership/url',
    service_versions: [ '1.0', '2.0' ]
  },
  platformContext: { // Context of connection
    context: { id: '2', label: 'course label', title: 'course title', type: [Array] },
    resource: { title: 'Activity name', id: '1' }, // Activity that originated login
    custom: { // Custom parameter sent by the platform
      resource: '123456', // Id for a requested resource
      system_setting_url: 'http:platform/customs/system/setting',
      context_setting_url: 'http:platform/customs/context/setting',
      link_setting_url: 'http:platform/customs/link/setting'
    }
  }
}
```

You can also get direct access to the **platformContext** portion of the token, that contains context specific information such as custom parameters, via the **res.locals.context** variable, accessible in every endpoint reached via the normal authentication flow.

---

### Routing and context

Your tool can be used with an unlimited amount of platforms, that is the idea behind LTI, so it needs a way to track which platform and resource is currently being accessed and return the correct token information relevant to each context.

In **Ltijs** this is done matching the **ltik** token (passed to the application via a query parameter) with it's corresponding session cookies stored in the user's browser.

- Example application endpoint:

**<center>http://myltiprovider/app?ltik=LTIKTOKEN</center>**

The **ltik** parameter is a signed JWT that contains the platform id and context for the current user.

- Corresponding cookies

**<center>platCONTEXT_ID</center>**
**<center>platCONTEXT_ID/</center>**




> As you can see there is more than one cookie stored, that is because Ltijs also keeps track of multiple activities linked to the tool within a same platform, so the path specific cookie keeps track of activity specific information, like custom parameters, that might point to a specific resource.


The CONTEXT_ID is a url encoded base64 value that represents a platform url combined with the activity id, this value is automatically generated, stored in the ltik JWT and passed to the application when the `redirect()` function is called:


```javascript
lti.onConnect((connection, request, response) => {
  // Call redirect function
  lti.redirect(response, '/main') // Redirects to http://provider/main?ltik=LTIKTOKEN
})
```


The previous call generates the following cookies:

**<center>platCONTEXT_ID</center>**
**<center>platCONTEXT_ID/</center>**


> **But if i redirected to /main why is there no platCONTEXT_ID/main cookie set?**

#### Serving multiple resources

That happens because the call `lti.redirect(response, '/main')`, doesn't specify that the `/main` path is a specific resource inside the provider, so a request to `/main` will work within the context of `platCONTEXT_ID/` as a subroute.

- If you want to specify that the call to `/main` should work within the context of a new resource you just have to set the ```isNewResource``` property of the options parameter of `lti.rediret()` as `true`:


```javascript
lti.onConnect((connection, request, response) => {
  // Call redirect function
  lti.redirect(response, '/main', { isNewResource: true }) // Redirects to http://provider/main?ltik=LTIKTOKEN within a new context
})
```


The previous call generates the following cookies:

> Platform context info 

**<center>platCONTEXT_ID</center>**

> Most recent request context info

**<center>platCONTEXT_ID/</center>**

> Route specific context info

**<center>platCONTEXT_ID/main</center>**


If you don't want to have a cookie representing the ```\``` route (if you are not using the ```\``` route for anything except redirecting, for example), you can set the ```ignoreRoot``` property of the options parameter of `lti.rediret()` as `true`: 

```javascript
lti.onConnect((connection, request, response) => {
  // Call redirect function
  lti.redirect(response, '/main', { isNewResource: true, ignoreRoot: true }) // Redirects to http://provider/main?ltik=LTIKTOKEN within a new context
})
```

Then the cookie representing the ```\``` route wont be generated:

> Platform context info 

**<center>platCONTEXT_ID</center>**

> Route specific context info

**<center>platCONTEXT_ID/main</center>**




And now calls to the `http://provider/main?ltik=LTIKTOKEN` url will get the information from these cookies, assemble a **IdToken** and pass it to the request handler (`lti.app.get('/main')`).



Everytime a application is launched it is **HIGHLY RECOMMENDED** to store in the session storage the **ltik** query parameter, so that you can later more easely retrieve in the client and pass it back to the provider when requesting or sending information.

#### Serving external resources

Ltijs can serve external resources through the `redirect()` function, doing so **automatically sets the cookie's secure flag to true and the sameSite flag to None, that means that external resources can only be served through https.**

```javascript
lti.app.get('/redirect', (req, res) => {
  lti.redirect(res, 'https://example.com') // External resource
})
```

Due to cookies limitations, external resources will only have access to the idtoken if they are in **the same domain (they can be in different subdomains).**


#### Routes

Routes in Ltijs can be created using the **lti.app object**, in the same way you would do in a regular Express server.

```javascript
lti.app.get('/getname', (req, res) => {
  res.send('Working fine!')
})
```

But these routes can only be accessed via the `lti.redirect(res, route)` method, that receives a Express response object and the desired route. Or via the ltik token, that can be passed through query and body parameters as well as Bearer authorization header, and is used to make requests from the client.

```javascript
lti.app.get('/redirect', (req, res) => {
  lti.redirect(res, '/newroute')
})
```

The `lti.redirect` method, automatically adds the **ltik** parameter to the request, giving the route access to the **idtoken**.




#### Making requests from the client

The client can call routes to get or send information to the provider by passing the `ltik` token via query parameters, body parameters or Bearer authorization headers as described above, failing to do so will return a **400 bad request status**.

***OBS: YOU CAN ONLY PASS THE LTIK TOKEN THROUGH ONE OF THE POSSIBLE METHODS AT A TIME, SENDING MORE THAN ONE TOKEN RESULTS IN A 400 ERROR DUE TO THE BEARER TOKEN SPECIFICATION.***

A request to `https://myprovider/gettoken?ltik=LTIKTOKEN` will be handled by `lti.app.get('/gettoken')` and will have access to the idtoken.

***Requests from resources in different domains need to set `mode: cors` and `credentials: include` flags to successfully send a request to the server, doing so tells the browser to pass the session cookies along:***

```javascript
request.post('https://mylti.com/api/post', { form: data, headers: { Authorization: 'Bearer LTIK' }, mode: 'cors', credentials: 'include' })
```


#### Whitelisting routes

You can whitelist routes to bypass the LTI 1.3 security protocol, but these routes won't have access to an idToken.


```javascript
lti.whitelist('/main', '/home', { route: '/route', method: 'POST' }) // You can add as many as you want lti.whitelist('/main', '/home', '/route')
```

Now calls to ```/main``` don't require the ltik token to be passed. The requests will be handled by `lti.app.get('/main')` and will not have access to an idToken.

___


### Deep Linking with Ltijs

The Deep Linking Service class documentation can be accessed [here](https://cvmcosta.me/ltijs/#/deeplinking).

---

### Sending grades with Ltijs

The Grading Service class documentation can be accessed [here](https://cvmcosta.me/ltijs/#/grading).


---

### The Names and Roles Provisioning Service

The Names and Roles Provisioning Service class documentation can be accessed [here](https://cvmcosta.me/ltijs/#/namesandroles).


---

## Debugging


**Ltijs** uses [debug](https://www.npmjs.com/package/debug) to log various events to the console. Just append `DEBUG='provider:*'` before your node or npm command and it should work.

```shell
DEBUG='provider:*' npm start
```

---


## Contributing

Please ⭐️ the repo, it always helps! 

If you find a bug or think that something is hard to understand feel free to open an issue or contact me on twitter [@cvmcosta](https://twitter.com/cvmcosta), pull requests are also welcome :)


And if you feel like it, you can donate any amount through paypal, it helps a lot.

<a href="https://www.buymeacoffee.com/UL5fBsi" target="_blank"><img width="217" src="https://cdn.buymeacoffee.com/buttons/lato-green.png" alt="Buy Me A Coffee"></a>


### Main contributors

<table>
  <tr>
    <td align="center"><a href="https://github.com/Cvmcosta"><img src="https://avatars2.githubusercontent.com/u/13905368?s=460&v=4" width="100px;" alt="Carlos Costa"/><br /><sub><b>Carlos Costa</b></sub></a><br /><a href="#" title="Code">💻</a><a href="#" title="Answering Questions">💬</a> <a href="#" title="Documentation">📖</a> <a href="#" title="Reviewed Pull Requests">👀</a> <a href="#" title="Talks">📢</a></td>
    <td align="center"><a href="https://github.com/lucastercas"><img src="https://avatars1.githubusercontent.com/u/45924589?s=460&v=4" width="100px;" alt="Lucas Terças"/><br /><sub><b>Lucas Terças</b></sub></a><br /><a href="#" title="Documentation">📖</a> <a href="https://github.com/lucastercas/ltijs-firestore" title="Tools">🔧</a></td>
    <td align="center"><a href="https://github.com/micaelgoms"><img src="https://avatars0.githubusercontent.com/u/23768058?s=460&v=4" width="100px;" alt="Micael Gomes"/><br /><sub><b>Micael Gomes</b></sub></a><br /><a href="#" title="Design">🎨</a></td>    
  
  </tr>
  
</table>


---

## Special thanks

<div align="center">
	<a href="https://portais.ufma.br/PortalUfma/" target='_blank'><img width="150" src="ufma-logo.png"></img></a>
  <a href="https://www.unasus.ufma.br/" target='_blank'><img width="350" src="unasus-logo.png"></img></a>
</div>

> I would like to thank the Federal University of Maranhão and UNA-SUS/UFMA for the support throughout the entire development process.




<div align="center">
<br>
	<a href="https://coursekey.com/" target='_blank'><img width="180" src="coursekey-logo.png"></img></a>
</div>

> I would like to thank CourseKey for making the Certification process possible and allowing me to be an IMS Member through them, which will contribute immensely to the future of the project.



---

## License

[![APACHE2 License](https://img.shields.io/github/license/cvmcosta/ltijs)](LICENSE)
