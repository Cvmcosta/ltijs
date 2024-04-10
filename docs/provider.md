<div align="center">
	<br>
	<br>
	<a href="https://cvmcosta.github.io/ltijs"><img width="360" src="logo-300.svg"></img></a>
  <a href="https://site.imsglobal.org/certifications/coursekey/ltijs"​ target='_blank'><img width="80" src="https://www.imsglobal.org/sites/default/files/IMSconformancelogoREG.png" alt="IMS Global Certified" border="0"></img></a>
</div>



> Easily turn your web application into a LTI® 1.3 Learning Tool.


[![codecov](https://codecov.io/gh/Cvmcosta/ltijs/branch/master/graph/badge.svg)](https://codecov.io/gh/Cvmcosta/ltijs)
[![Node Version](https://img.shields.io/node/v/ltijs.svg)](https://www.npmjs.com/package/ltijs)
[![NPM package](https://img.shields.io/npm/v/ltijs.svg)](https://www.npmjs.com/package/ltijs)
[![NPM downloads](https://img.shields.io/npm/dm/ltijs)](https://www.npmjs.com/package/ltijs)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![APACHE2 License](https://img.shields.io/github/license/cvmcosta/ltijs)](#LICENSE)
[![Donate](https://img.shields.io/badge/Donate-Buy%20me%20a%20coffe-blue)](https://www.buymeacoffee.com/UL5fBsi)


Please ⭐️ us on [GitHub](https://github.com/Cvmcosta/ltijs), it always helps! 

> [Ltijs is LTI® Advantage Complete Certified by IMS](https://site.imsglobal.org/certifications/coursekey/ltijs)

> Ltijs is the first LTI Library to implement the new [LTI® Advantage Dynamic Registration Service](https://cvmcosta.me/ltijs/#/dynamicregistration), now supported by **Moodle 3.10**. 
> The Dynamic Registration Service turns the LTI Tool registration flow into a fast, completely automatic process.

> - [Migrating from version 4](https://cvmcosta.github.io/ltijs/#/migration)
> - [CHANGELOG](https://cvmcosta.github.io/ltijs/#/changelog)


---

<div align="center">
	<a href="https://ltiaas.com"><img width="330" src="https://raw.githubusercontent.com/Cvmcosta/ltijs/master/docs/ltiaas.svg"></img></a>
  <br>
  <br>
</div>

> A ready-to-go SaaS LTI solution.

If you need an enterprise-ready LTI deployment, LTIaaS can get you up and running in a matter of minutes. We offer a SaaS solution with a powerful, easy to use, API that gives you access to the entire functionality of the LTI protocol. And you only start paying once your product starts to grow.

Through our consultation services we can help you design, build and maintain your LTI tool. The LTIaaS API is already being used to reach thousands of students across the entire world!

> For more information visit [LTIaaS.com](https://ltiaas.com)
> - [API Documentation](https://ltiaas.com/docs/)
> - [Pricing information and simulator](https://ltiaas.com/pricing/)
> - [Contact us](https://ltiaas.com/contact-us/)

---


## Table of Contents

- [Introduction](#introduction)
- [Feature roadmap](#feature-roadmap)
- [Installation](#installation)
- [Quick start](#quick-start)
  - [Implementation example](#implementation-example)
- [Documentation](#documentation)
- [Setting up Ltijs](#setting-up-ltijs)
  - [Encryption key](#encryption-key)
  - [Database configuration](#database-configuration)
  - [Reserved endpoints configuration](#reserved-endpoint-configuration)
  - [Cookie configuration](#cookie-configuration)
  - [Development mode](#development-mode)
  - [Ltiaas mode](#ltiaas-mode)
  - [Token max age](#token-max-age-allowed)
  - [Server addon](#server-addon)
  - [Serving static files](#serving-static-files)
  - [Cors](#cors)
- [Using Ltijs](#using-ltijs)
  - [App](#app)
  - [Reserved endpoint routes](#reserved-endpoint-routes)
  - [OnConnect Callback](#onconnect)
  - [OnDeepLinking Callback](#ondeeplinking)
  - [OnInvalidToken Callback](#oninvalidtoken)
  - [OnSessionTimeout Callback](#onsessiontimeout)
  - [OnUnregisteredPlatform Callback](#onunregisteredplatform)
  - [OnInactivePlatform Callback](#oninactiveplatform)
  - [Deploy](#deploy)
  - [Registering a Platform](#registering-a-new-platform)
  - [Retrieving a Platform](#retrieving-a-platform)
  - [Modifying a Platform](#modifying-a-platform)
  - [Deleting a Platform](#deleting-a-platform)
- [Authentication and Routing](#lti-flow)
  - [Id Token](#idtoken)
  - [Context Token](#contexttoken)
  - [Launch authentication](#authentication)
  - [Request authentication](#request-authentication)
  - [Whitelisting routes](#whitelisting-routes)
  - [Redirecting with Ltijs](#redirecting-with-ltijs)
- [LTI® Advantage Services](#lti-advantage-services)
  - [Deep Linking](#deep-linking-service-with-ltijs)
  - [Assignment and Grades](#assignment-and-grades-service-with-ltijs)
  - [Names and Roles Provisioning](#names-and-roles-provisioning-service-with-ltijs)
  - [Dynamic Registration Service](#dynamic-registration-service-with-ltijs)
- [Debugging](#debugging)
- [Contributing](#contributing)
- [Special thanks](#special-thanks)
- [License](#license)

---

## Introduction

The Learning Tools Interoperability (LTI®) protocol is a standard for integration of rich learning applications within educational environments. <sup>[ref](https://www.imsglobal.org/spec/lti/v1p3/)</sup>


This library implements a tool provider as an [Express](https://expressjs.com/) server, with preconfigured routes and methods that manage the [LTI® 1.3](https://www.imsglobal.org/spec/lti/v1p3/) protocol for you. Making it fast and simple to create a working learning tool with access to every LTI® service, without having to worry about manually implementing any of the security and validation required to do so. 

---


## Feature roadmap

| Feature | Implementation | Documentation |
| --------- | - | - |
| [Keyset endpoint support](https://cvmcosta.me/ltijs/#/provider?id=keyset-endpoint) | <center>✔️</center> | <center>✔️</center> |
| [Deep Linking Service Class](https://cvmcosta.me/ltijs/#/deeplinking) | <center>✔️</center> | <center>✔️</center> |
| [Grading Service Class](https://cvmcosta.me/ltijs/#/grading) | <center>✔️</center> | <center>✔️</center> |
| [Names and Roles Service Class](https://cvmcosta.me/ltijs/#/namesandroles) | <center>✔️</center> | <center>✔️</center> |
| [Dynamic Registration Service ](https://cvmcosta.me/ltijs/#/dynamicregistration) | <center>✔️</center> | <center>✔️</center> |
| Database plugins | <center>✔️</center> | <center>✔️</center> |
| Revised usability tutorials | <center></center> | <center></center> |
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

  -  [Firestore Plugin](https://github.com/examind-ai/ltijs-firestore)

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
  { // Database configuration
    url: 'mongodb://localhost/database',
    connection: { user: 'user', pass: 'password' }
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

### Implementation example

 - [Example Ltijs Server](https://github.com/Cvmcosta/ltijs-demo-server)

 - [Example Client App](https://github.com/Cvmcosta/ltijs-demo-client)

---

## Documentation

### Provider
>The Ltijs Provider Class implements the LTI® 1.3 protocol and services.


#### Provider.app
[Express](https://expressjs.com/) server instance.

**Type**: ```Express```


#### Provider.Database
Database object. Allows you to perform the database operations using the same methods used by the internal code.

**Type**: ```Database```  


#### Provider.Grade
[Grade Class](https://cvmcosta.github.io/ltijs/#/grading), implementing the Assignment and Grade service of the LTI® 1.3 protocol.

**Type**: ```Grade```

#### Provider.DeepLinking
[DeepLinking Class](https://cvmcosta.github.io/ltijs/#/deeplinking), implementing the Deep Linking service of the LTI® 1.3 protocol.

**Type**: ```DeepLinking```

#### Provider.NamesAndRoles
[NamesAndRoles Class](https://cvmcosta.github.io/ltijs/#/namesandroles), implementing the Names and Roles Provisioning service of the LTI® 1.3 protocol.

**Type**: ```NamesAndRoles```

#### Provider.setup(encryptionkey, database [, options]) 

Method used to setup and configure the LTI® provider.




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
| options.dynRegRoute | `String`  | Dynamic registration route. **Default: '/register'**. | *Optional* |
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
| options.tokenMaxAge | `String` | Sets the idToken max age allowed in seconds. If false, disables max age validation. **Default: 10**. | *Optional* |
| options.devMode | `Boolean` | If true, does not require state and session cookies to be present (If present, they are still validated). This allows Ltijs to work on development environments where cookies cannot be set. **Default: false**. ***THIS SHOULD NOT BE USED IN A PRODUCTION ENVIRONMENT.*** | *Optional* |
| options.ltiaas | `Boolean` | If set to true, disables the creation and validation of the session cookies. Login state cookies are still created, since they are a part of the LTI specification. **Default: false** | *Optional* |
| options.dynReg | `Object` | Setup for the Dynamic Registration Service. | *Optional* |
| options.dynReg.url | `String` | Tool Provider main URL. (Ex: 'https://tool.example.com') |  |
| options.dynReg.name | `String` | Tool Provider name. (Ex: 'Tool Provider') |  |
| options.dynReg.logo | `String` | Tool Provider logo. (Ex: 'https://client.example.org/logo.png') | *Optional* |
| options.dynReg.description | `String` | Tool Provider description. (Ex: 'Tool description') | *Optional* |
| options.dynReg.redirectUris | `Array` | Additional redirect URIs. (Ex: ['https://tool.example.com/launch']) | *Optional* |
| options.dynReg.customParameters | `Object` | Custom parameters object. (Ex: `{ key: 'value' })` | *Optional* |
| options.dynReg.autoActivate | `Boolean` | Platform auto activation flag. If true, every Platform registered dynamically is immediately activated. **Default: false**. | *Optional* |

#### async Provider.deploy(options) 

Starts listening to a given port for LTI® requests and opens connection to the configured database.


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
lti.onSessionTimeout(async (req, res, next) => { return res.status(401).send(res.locals.err) })
```

*Ltijs provides a default method for this callback.*


#### Provider.onInvalidToken(invalidTokenCallback) 

Sets the callback method called when the token received fails the validation process.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| invalidTokenCallback | `Function`  |  Callback method called when the ltik or idtoken received fails the validation process. | &nbsp; |





##### Examples

```javascript
lti.onInvalidToken(async (req, res, next) => { return res.status(401).send(res.locals.err) })
```

*Ltijs provides a default method for this callback.*


#### Provider.onUnregisteredPlatform(unregisteredPlatformCallback) 

Sets the callback function called when the Platform attempting to login is not registered.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| unregisteredPlatformCallback | `Function`  |  Callback method called when the Platform attempting to login is not registered. | &nbsp; |





##### Examples

```javascript
lti.onUnregisteredPlatform((req, res) => { return res.status(400).send({ status: 400, error: 'Bad Request', details: { message: 'Unregistered Platform!' } }) })
```

*Ltijs provides a default method for this callback.*



#### Provider.onInactivePlatform(inactivePlatformCallback) 

Sets the callback function called when the Platform attempting to login is not activated.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| inactivePlatformCallback | `Function`  |  Callback method called when the Platform attempting to login is not activated. | &nbsp; |





##### Examples

```javascript
lti.onInactivePlatform((req, res) => { return res.status(401).send({ status: 401, error: 'Unauthorized', details: { message: 'Platform not active!' } }) })
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




#### Provider.keysetRoute() 

Gets the public JWK keyset Route.


##### Examples

```javascript
lti.keysetRoute()
```

#### Provider.dynRegRoute() 

Gets the dynamic registration Route.


##### Examples

```javascript
lti.dynRegRoute()
```


#### Provider.whitelist(urls)
Whitelists routes to bypass the Ltijs authentication protocol. If validation fails, these routes are still accessed but aren't given an idToken.



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

#### async Provider.getPlatformById(platformId) 

Retrieves a [Platform](platform.md).




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| platformId | `String`  | Platform Id. | &nbsp; |





##### Returns


- Promise that resolves a [Platform](platform.md).


##### Example

```javascript
const plat = await lti.getPlatformById('asdih1k12poihalkja52')
```



#### async Provider.deletePlatform(url, clientId) 

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

#### async Provider.deletePlatformById(paltformId) 

Deletes a [Platform](platform.md).



##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| platformId | `String`  | Platform Id. | &nbsp; |


##### Returns

- Promise that resolves ```true```.

##### Example

```javascript
await lti.deletePlatformById('60b1fce753c875193d71b')
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
| [options.newResource] | <code>Boolean</code> | If true, changes the path variable on the context token. | *Optional* |
| [options.query] | <code>Object</code> | Query parameters that should be added to the redirection URL. | *Optional* |

**Example**  
```js
lti.redirect(res, '/path', { newResource: true, query: { param: 'value' } })
// Redirects to /path?param=value
```

---

## Setting up Ltijs

When using Ltijs, the first step must **always** be to call the `lti.setup()` method to configure the LTI® provider:

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

- **dynRegRoute** - Route used to handle Dynamic Registration requests. **Default: '/register'**.

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
            dynRegRoute: '/register' // Specifying Dynamic registration route
          })
```

#### Cookie configuration:

Ltijs sets session cookies throughout the LTI® validation process, how these cookies are set can be configured through the `cookies` field of the **options** parameter:

- **secure** - Determines if the cookie can only be sent through **https**. **Default: false**.

- **sameSite** - Determines if the cookie can be sent cross domain. **Default: Lax**.

- **domain** - Determines the cookie domain. This option can be used to set cookies that can be shared between all subdomains.

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
              sameSite: 'None',
              domain: '.domain.com'
            }
          })
```

***If the platform and tool are in different domains, some browsers will not allow cookies to be set unless they have the `secure: true` and `sameSite: 'None'` flags. If you are in a development environment and cannot set secure cookies (over https), consider using Ltijs in `Development mode`.***

#### Development mode:

Ltijs relies on cookies for part of the validation process, but in some development environments, cookies might not be able to be set, for instance if you are trying to set cross domain cookies over an insecure http connection. 

In situations like this you can set the `devMode` field as true and Ltijs will stop trying to validate the cookies and will instead use the information obtained through the `ltik` token to retrieve the correct context information.

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

***DevMode should never be used in a production environment, and it should not be necessary, since most of the cookie issues can be solved by using the `secure: true` and `sameSite: None` flags.***

#### Ltiaas mode:

Ltijs can remove the session cookie request authentication step by using `ltiaas` (lti as a service) mode. If this option is set to true, Ltijs will no longer create or validade the session cookies, all the request validation will be done through the `ltik` token. Ltiaas mode differs from development mode because it still creates and validates login state cookies.

```javascript
// Setup provider example
lti.setup('EXAMPLEKEY', 
          { 
            url: 'mongodb://localhost/database',// Database url
            connection:{ user:'user', pass: 'pass'}// Database configuration
          }, 
          { 
            ltiaas: true // Using ltiaas mode
          })
```

[See more about request authentication.](#request-authentication)


#### Token max age allowed:

As part of the LTI® 1.3 protocol validation steps, Ltijs checks the idtoken's `iat` claim and flags the token as invalid if it is older than **10 seconds**. 

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

The specified path is internally bound to the root route:

```javascript
app.use('/', express.static(SPECIFIED_PATH, { index: '_' }))
```
Accessing the files:

```
http://localhost:3000/images/kitten.jpg
http://localhost:3000/css/style.css
http://localhost:3000/js/app.js
http://localhost:3000/images/bg.png
http://localhost:3000/hello.html
```

This can also be achieved and further customized by using [server addons](#server-addon):


```javascript
// Creating middleware registration
const middleware = (app) => {
  app.use('/static', express.static(__dirname + '/public'));
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
And then accessing the files through the specified `/static` route:

```
http://localhost:3000/static/images/kitten.jpg
http://localhost:3000/static/css/style.css
http://localhost:3000/static/js/app.js
http://localhost:3000/static/images/bg.png
http://localhost:3000/static/hello.html
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

---

## Using Ltijs

After the `lti.setup()` method is called, the `lti` object gives you access to various functionalities to help you create your LTI® Provider. 

The `lti` object is a singleton that can be accessed across multiple files while calling `lti.setup()` only once:

You can setup Ltijs in file `a.js`:

```javascript
// a.js 
// Require Provider 
const lti = require('ltijs').Provider
// Require b.js
const routes = require('./b')

// Setup method can be called only once
lti.setup('LTIKEY',
         { url: 'mongodb://localhost/database' },
         { appRoute: '/', loginRoute: '/login' })

// Setting up routes
lti.app.use(routes)

lti.deploy()
```

And access the same object in a second file `b.js`:

```javascript
// b.js 
// Require Provider 
const lti = require('ltijs').Provider
// Require express router
const router = require('express').Router()

router.post('/grade', async (req, res) => {
  let grade = {
    scoreGiven: 50,
    activityProgress: 'Completed',
    gradingProgress: 'FullyGraded'
  }

  // Using lti object to access Grade Service in another file
  await lti.Grade.scorePublish(res.locals.token, grade)
  return res.sendStatus(201)
})

module.exports = router
```

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

- **lti.dynRegRoute**

  ```javascript
  const dynRegRoute = lti.dynRegRoute() // returns '/register' by default
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

Launches directed at other endpoints are also valid but **are not handled by the `onConnect` callback**, instead they must be handled by their own `Express` route:

```javascript
// This route can handle launches to /endpoint
lti.app.get('/endpoint', async (req, res, next) => {
    console.log(res.locals.token)
    return res.send('User connected!') 
  }
)
```

#### onDeepLinking

The `onDeepLinking` callback is called whenever a successfull deep linking request arrives at the main app url. This callback can be set through the `lti.onDeepLinking()` method. 

The callback route will be given a first parameter `token`, that is the user's validated [idtoken](#idtoken), and the three Express route parameters (request, response and next).

> *This callback should be used to display your **LTI® provider's deep linking UI**.*

```javascript
lti.onDeepLinking(async (token, req, res, next) => {
    return res.send('Deep Linking is working!')
  }
)
```

> [See more about the Deep Linking Service](https://cvmcosta.me/ltijs/#/deeplinking)


#### onInvalidToken

The `onInvalidToken` callback is called whenever the idtoken received fails the LTI® validation process. This callback can be set through the `lti.onInvalidToken()` method.

The callback route will be given the three Express route parameters (request, response and next). And will also have **access to a `res.locals.err` object**, containing information about the error.

> *This callback should be used to display your **invalid token error screen**.*

```javascript
lti.onInvalidToken(async (req, res, next) => { 
    return res.status(401).send(res.locals.err)
  }
)
```


*Ltijs provides a default method for this callback that returns a 401 error code with the `res.locals.err` object:*

```
{ status: 401, error: 'Unauthorized', details: { message: 'ERROR_MESSAGE' } }
```

#### onSessionTimeout

The `onSessionTimeout` callback is called whenever no valid session is found during a request validation. This callback can be set through the `lti.onSessionTimeout()` method.

The callback route will be given the three Express route parameters (request, response and next). And will also have **access to a `res.locals.err` object**, containing information about the error.

> *This callback should be used to display your **session timeout error screen**.*

```javascript
lti.onSessionTimeout(async (req, res, next) => { 
    return res.status(401).send(res.locals.err) 
  }
)
```

*Ltijs provides a default method for this callback that returns a 401 error code with the `res.locals.err` object:*

```
{ status: 401, error: 'Unauthorized', details: { message: 'ERROR_MESSAGE' } }
```


#### onUnregisteredPlatform

The `onUnregisteredPlatform` callback is called whenever the Platform attempting to start a LTI launch is not registered.

The callback route will be given the two Express route parameters (request, response).

> *This callback should be used to display your **Unregistered Platform error screen**.*

```javascript
lti.onUnregisteredPlatform((req, res) => { 
  return res.status(400).send({ status: 400, error: 'Bad Request', details: { message: 'Unregistered Platform!' } }) 
})
```
*Ltijs provides a default method for this callback that returns a 400 error code with the default error object:*
```
{ status: 400, error: 'Bad Request', details: { message: 'UNREGISTERED_PLATFORM' } }
```

#### onInactivePlatform

The `onInactivePlatform` callback is called whenever the Platform attempting to start a LTI launch was registered through [Dynamic Registration](https://cvmcosta.me/ltijs/#/dynamicregistration) and is not active.

The callback route will be given the two Express route parameters (request, response).

> *This callback should be used to display your **Inactive Platform error screen**.*

```javascript
lti.onInactivePlatform((req, res) => { 
  return res.status(401).send({ status: 401, error: 'Unauthorized', details: { message: 'Platform not active!' } }) 
})
```
*Ltijs provides a default method for this callback that returns a 401 error code with the default error object:*
```
{ status: 401, error: 'Unauthorized', details: { message: 'PLATFORM_NOT_ACTIVATED' } }
```



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


### Platform

*Platform manipulation methods require a connection to the database, so they can only be used after the `lti.deploy()` method.*

> [Check the Platform Class Documentation](platform.md)

#### Registering a new Platform

A LTI® tool works in conjunction with an LTI® ready platform, so in order for a platform to display your tool's resource, it needs to first be registered in the tool provider.

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

Platforms can also be registered by utilizing the [Dynamic Registration Service](https://cvmcosta.me/ltijs/#/dynamicregistration).

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

**lti.getPlatformById:**

The `lti.getPlatformById()` method receives the `platformId` and returns a Promise that resolves a [Platform](platform.md) object.

``` javascript
const plat = await lti.getPlatformById('60b1fce753c875193d71') // Returns Platform object
```

The platform Id can be found through the `Platform.platformId()` method or in the platformId field of the `idtoken` object after a successful launch.

**lti.getAllPlatforms:**

The `lti.getAllPlatforms()` method returns a Promise that resolves an Array containing every registered [Platform](platform.md).

```javascript
const platforms = await lti.getAllPlatforms() // Returns every registered platform
```

#### Modifying a Platform

After a platform is registered, it's **name**, **authenticationEndpoint**, **accesstokenEndpoint** and **authConfig** parameters can still be modified in two ways:

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

Registered platforms can be deleted using the `lti.deletePlatform()` and `lti.deletePlatformById()` methods. 

The `lti.deletePlatform()` method receives two arguments, `platformUrl` and `clientId`:

``` javascript
await lti.deletePlatform('http://plat.com', 'CLIENTID') // Deletes a platform
```

The `lti.deletePlatformById()` method receives the argument `platformId`:

``` javascript
await lti.deletePlatformById('60b1fce753c875193d71b') // Deletes a platform
```


---

## Authentication and Routing

The LTI® 1.3 protocol works in such a way that every successful launch from the platform to the tool generates an **IdToken** that the tool uses to retrieve information about the user and the general context of the launch.

Whenever a successful launch request is received by Ltijs, the idToken received at the end of the process is validaded according to the [LTI® 1.3 security specifications](https://www.imsglobal.org/spec/security/v1p0/).

The valid idtoken is then separated into two parts `idtoken` and `contexttoken`, that are stored in the databased and passed along to the next route handler inside the `response.locals` object:

### Idtoken

The `idtoken` will contain the platform and user information that is context independent, and will be stored in the `res.locals.token` object, or the `token` parameter if the `onConnect` is being used:

```javascript
onConnect(async (token, req, res) => {
  // Retrieving idtoken through response object
  console.log(res.locals.token)
  // Retrieving idtoken through onConnect token parameter
  console.log(token)
})
```


The `idtoken` object consists of: 

```javascript
// Example idtoken for a Moodle platform
{
  "iss": "http://localhost/moodle",
  "clientId": "CLIENTID",
  "deploymentId": "1",
  "platformId": "60b1fce753c875193d71b611e895f03d"
  "platformInfo": {
    "product_family_code": "moodle",
    "version": "2020042400",
    "guid": "localhost",
    "name": "moodle",
    "description": "Local Moodle"
  },
  "user": "2",
  "userInfo": {
    "given_name": "Admin",
    "family_name": "User",
    "name": "Admin User",
    "email": "local@moodle.com"
  }
}
```


### ContextToken

The `contexttoken` will contain the context specific information, and will be stored in the `res.locals.context` object and as a part of the `idtoken` object as the `platformContext` field:

```javascript
onConnect(async (token, req, res) => {
  // Retrieving contexttoken through response object
  console.log(res.locals.context)
  // Retrieving contexttoken through idtoken object
  console.log(token.platformContext)
})
```


The `contexttoken` object consists of: 

```javascript
// Example contexttoken for a Moodle platform
{
  "contextId": "http%3A%2F%2Flocalhost%2FmoodlewTtQU3zWHvVeCUf12_57",
  "path": "/",
  "user": "2",
  "roles": [
    "http://purl.imsglobal.org/vocab/lis/v2/institution/person#Administrator",
    "http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor",
    "http://purl.imsglobal.org/vocab/lis/v2/system/person#Administrator"
  ],
  "targetLinkUri": "http://localhost:3000",
  "context": {
    "id": "2",
    "label": "course",
    "title": "Course",
    "type": [
      "CourseSection"
    ]
  },
  "resource": {
    "title": "Ltijs Demo",
    "id": "57"
  },
  "custom": {
    "system_setting_url": "http://localhost/moodle/mod/lti/services.php/tool/1/custom",
    "context_setting_url": "http://localhost/moodle/mod/lti/services.php/CourseSection/2/bindings/tool/1/custom",
    "link_setting_url": "http://localhost/moodle/mod/lti/services.php/links/{link_id}/custom"
  },
  "lis": {
    "person_sourcedid": "",
    "course_section_sourcedid": ""
  },
  "endpoint": {
    "scope": [
      "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem",
      "https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly",
      "https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly",
      "https://purl.imsglobal.org/spec/lti-ags/scope/score"
    ],
    "lineitems": "http://localhost/moodle/mod/lti/services.php/2/lineitems?type_id=1",
    "lineitem": "http://localhost/moodle/mod/lti/services.php/2/lineitems/26/lineitem?type_id=1"
  },
  "namesRoles": {
    "context_memberships_url": "http://localhost/moodle/mod/lti/services.php/CourseSection/2/bindings/1/memberships",
    "service_versions": [
      "1.0",
      "2.0"
    ]
  },
  "launchPresentation": {
    "locale": "en",
    "document_target": "iframe",
    "return_url": "http://localhost/moodle/mod/lti/return.php?course=2&launch_container=3&instanceid=57&sesskey=6b5H1MF8yp"
  },
  "messageType": "LtiResourceLinkRequest",
  "version": "1.3.0"
}
```

### Authentication

Ltijs need as way to retrieve the correct `idtoken` and `contexttoken` information whenever a tool makes a request. The authentication protocol is based on two items, a **session cookie** and a **ltik** token.

#### Launches

<div align="center">
  </br>
	<img width="500" src="launch.png"></img>
  <div><sub>Launch process</sub></div>
  </br>
</div>


A platform can launch to **any of the tool's endpoints**, but only launches targeting the specified `appRoute` will be sent to the [onConnect callback](#onconnect). **Launches to other endpoints must be handled by their specific `Express` routes.**

At the end of a successful launch, Ltijs redirects the request to the desired endpoint, but it also does two other things:
 
- Sets a **signed session cookie** containing the `platformCode` and `userId` information; 

- Sends a **ltik** JWT token containing the same platform and user information, with additional context information as a query parameter to the endpoint.

> [See more about cookie configuration options](#cookie-configuration)

#### Request authentication

<div align="center">
  </br>
	<img width="500" src="request.png"></img>
  <div><sub>Request process</sub></div>
  </br>
</div>

> [Check implementation examples](#implementation-example)

Whenever the tool receives a request **not directed at one of the reserved endpoints** it attempts to validate the request by matching the information received through the [session cookie](#cookies) with the information contained in the **ltik** token.

The `ltik` token **MUST** be passed to the provider through query parameters, body parameters or an Authorization header (Bearer or LTIK-AUTH-V1).

##### Ltik in the query parameters:

The `ltik` token can be passed through the URL query parameters:

> https://tool.com?ltik=\<ltik\>

Example:

> https://tool.com?ltik=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c

##### Ltik in the request body:

The `ltik` token can be passed through the request body:

```javascript
{
  ltik: <ltik>
}
```

Example:

```javascript
{
  ltik: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
}
```

##### Bearer Authorization header:

The `ltik` parameter can be passed through a Bearer Authorization header:

> Authorization: Bearer \<ltik\>


Example:

> Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c

##### LTIK-AUTH-V1 Authorization header:

If there is need for an additional Authorization header, **Ltijs** implements it's own authorization schema `LTIK-AUTH-V1` with support for multiple authorization methods:

> Authorization: LTIK-AUTH-V1 Token=\<ltik\>, Additional=\<additional\>

- **Token** - Ltik authentication token.
- **Additional** - Additional authorization schema.

Example:

> Authorization: LTIK-AUTH-V1 Token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c, Additional=Bearer KxwRJSMeKKF2QT4fwpM

When using the `LTIK-AUTH-V1` authorization schema, `req.headers.authorization` will only include the `Additional` portion of the header. The `ltik` token can be found in `req.token`.

##### Ltik order of priority:

**Ltijs** will look for the `ltik` in the following order:

- LTIK-AUTH-V1 Authorization 
- query 
- body 
- Bearer Authorization

##### Cookies

*In the case of requests coming from different subdomains, usually it is necessary to set `mode: cors` and `credentials: 'include'` flags to include the cookies in the request.*

*If for some reason the cookies could not be set in your development environment, the usage of the **devMode** flag eliminates the validation step that matches the cookie information, instead using only the information contained in the **ltik** token.*

> [See more about development mode]((#development-mode))

If the validation fails, the request is handled by the **invalidTokenCallback** or the **sessionTimeoutCallback**.

**Cookie creation and validation can be disabled by setting `ltiaas: true` in the [setup options](#ltiaas-mode):**

```javascript
// Setup provider example
lti.setup('EXAMPLEKEY', 
          { 
            url: 'mongodb://localhost/database',// Database url
            connection:{ user:'user', pass: 'pass'}// Database configuration
          }, 
          { 
            ltiaas: true // Using ltiaas mode
          })
```

Request validation will be done only through the `ltik` token similarly to the development mode, but maintaining the creation and validation of login state cookies. This allows Ltijs to be used as a service, receiving requests from other backend servers.


#### Whitelisting routes


Routes can be whitelisted to bypass the Ltijs authentication protocol **in case of validation failure**, this means that these routes work normally, but if the request sent to them fails validation they are still reached but don't have access to a `idtoken` or `contexttoken`.

A good way to exemplify this behaviour is by using it to create a landing page, that will be accessed if a request to the whitelisted route fails validation:

```javascript
// Whitelisting the main app route and /landingpage to create a landing page
lti.whitelist(lti.appRoute(), { route: '/landingpage', method: 'get' })

// When receiving successful LTI® launch redirects to app, otherwise redirects to landing page
lti.onConnect(async (token, req, res, next) => {
  // Checking if received idtoken
  if (token) return res.sendFile(path.join(__dirname, './public/index.html'))
  else lti.redirect(res, '/landingpage') // Redirects to landing page
})
```

Whitelisted routes are created using the `lti.whitelist()` method that can receive two types of arguments:

- **Route strings**

Route strings will be whitelisted for **every method**:

```javascript
lti.whitelist('/route1')

// The lti.whitelist() method can receive multiple arguments
lti.whitelist('/route1', '/route2', '/route3')
```

- **Route object**

Route objects let you specify **whitelisted methods**:

```javascript
lti.whitelist({ route: '/route1', method: 'get' })

// Route objects can also be whitelisted for every method
lti.whitelist({ route: '/route1', method: 'all' })

// The lti.whitelist() method can receive multiple arguments of different trypes
lti.whitelist({ route: '/route1', method: 'get' }, { route: '/route2', method: 'post' }, '/route3')
```

Routes can also be set using Regex which means that you can whitelist a big range of routes:

```javascript
// Using Regex
lti.whitelist(new RegExp(/^\/route1/), { route: new RegExp(/^\/route2/), method: 'get' })
```

The `new RegExp(/^\/route1/)` regex will whitelistd every route that starts with `/route`.

**Be careful when using regex to whitelist routes, you could whitelist routes accidentally and that can have a big impact on your application. It is recommended to use the start-of-string (^) and end-of-string ($) anchors to avoid accidental matches.**


#### Redirecting with Ltijs

The Ltijs authentication protocol relies on the `ltik` token being passed to endpoints as query parameters. 

To make this process seamless, the `lti.redirect()` method can be used to redirect to an endpoint passing the `ltik` token automatically:

```javascript
lti.onConnect(async (token, req, res) => {
  return lti.redirect(res, '/route') // Redirects to /route with the ltik token
})

lti.get('/route', async (req, res) => {
  return lti.redirect(res, '/route/b?test=123') // Redirects to /route/b with the ltik token and additional query parameters
})
```

The `lti.redirect()` method requires two parameter:

- **Response** - The `Express` response object, that will be used to perform the redirection and retrieve the `idtoken` and `ltik`.

- **Url** - The redirection target.

The `url` parameter can be an internal route ('/route') or a complete URL ('https://domain.com'), but how the redirection works depends on some conditions:

- If the target is on the same domain and subdomain ('https://domain.com', '/route'), it will have access to the `ltik` and `session cookie` and will pass the Ltijs authentication protocol.

- If the complete URL is on the same domain but on a different subdomain ('https://a.domain.com'), it will have access to the `ltik` but it might require a cookie domain to be set:

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
        sameSite: 'None',
        domain: '.domain.com'
      }
    }
  )
  ```
  Setting the domain to `.domain.com` allows the `session cookie` to be accessed on every domain.com subdomain (a.domain.com, b.domain.com).

- If the complete URL is on a different domain, it will have access to the `ltik`, but **it will not have access to a `session cookie`**, and will only be able to make successful requests to whitelisted routes.

- If the route originating the resource does not have access to an `idtoken` (whitelisted route), `lti.redirect()` method will still perform the redirection, but the target will not have access to the `ltik` nor the `session cookie`. 


The `lti.redirect()` method also has an `options` parameter that accepts two fields:

-  ***newResource***: If this field is set to true, the `contexttoken` object has it's `path` field changed to reflect the target route. The `path` field can be used to keep track of the main resource route even after several redirections.

```javascript
lti.onConnect(async (token, req, res) => {
  return lti.redirect(res, '/route', { newResource: true })
})
```

- ***query***: This field can be used to easely add query parameter to target URL.
```javascript
lti.onConnect(async (token, req, res) => {
  return lti.redirect(res, '/path', { newResource: true, query: { param: 'value' } })
  // Redirects to /path?param=value
})
```


*If for some reason you want to redirect manually, the `ltik` token can be retrieved, **after a valid request**, through the `res.locals.ltik` variable.*

___

## LTI® Advantage Services


### Deep Linking Service with Ltijs

The Deep Linking Service class documentation can be accessed [here](https://cvmcosta.me/ltijs/#/deeplinking).


### Assignment and Grades Service with Ltijs

The Assignment and Grades Service class documentation can be accessed [here](https://cvmcosta.me/ltijs/#/grading).



### Names and Roles Provisioning Service with Ltijs

The Names and Roles Provisioning Service class documentation can be accessed [here](https://cvmcosta.me/ltijs/#/namesandroles).

### Dynamic Registration Service with Ltijs

The Dynamic Registration Service documentation can be accessed [here](https://cvmcosta.me/ltijs/#/dynamicregistration).

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


<div align="center">
<br>
	<a href="https://www.examind.io/" target='_blank'><img width="280" src="https://raw.githubusercontent.com/Cvmcosta/ltijs/master/docs/examind-logo.png"></img></a>
</div>

> I would like to thank Examind for the amazing work on the Firestore database plugin. As well as the continuous help and support in the development of this project.


---

## License

[![APACHE2 License](https://img.shields.io/github/license/cvmcosta/ltijs)](LICENSE)

> *Learning Tools Interoperability® (LTI®) is a trademark of the IMS Global Learning Consortium, Inc. (https://www.imsglobal.org)*
