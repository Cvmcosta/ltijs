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

> Ltijs version 5.0 is a re-release of the project as a Certified LTI library, that comes with many improvements and new functionalities and a few API changes, see bellow for a migration guide from version 4.0 and a complete list of the changes made:
> - [Migrating from version 4](https://cvmcosta.github.io/ltijs/#/migration)
> - [5.0 Changelog](https://cvmcosta.github.io/ltijs/#/certchanges)

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



## Table of Contents

- [Introduction](#introduction)
- [Examples](#examples)
- [Tutorial](#tutorial)
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
- [Logging and Debugging](#logging-and-debugging)
- [Contributing](#contributing)
- [Special thanks](#special-thanks)
- [License](#license)

---
## Introduction
According to the [IMS Global Learning Consortium](https://www.imsglobal.org/), a  LTI tool Provider is the external application or service providing functionality to the consumer [platform](platform.md). <sup>[ref](https://www.imsglobal.org/spec/lti/v1p3/#platforms-and-tools)</sup>


This package implements a tool provider as an [Express](https://expressjs.com/) server, with preconfigured routes and methods that manage the [LTI 1.3](https://www.imsglobal.org/spec/lti/v1p3/) protocol for you. Making it fast and simple to create a working learning tool without having to worry about manually implementing any of the security and validation required to do so. 

#### Other documentations
- [Platform class documentation](https://cvmcosta.me/ltijs/#/platform)
- [Deep Linking Service class documentation](https://cvmcosta.me/ltijs/#/deeplinking)
- [Grading Service class documentation](https://cvmcosta.github.io/ltijs/#/grading)


---

## Examples

Example of provider usage

> Install Ltijs

```shell
$ npm install ltijs
```

> Install mongoDB. Ltijs  uses mongodb to store and manage information

 - [Installing mongoDB](https://docs.mongodb.com/manual/administration/install-community)

 ***WARNING: THE 3.0 (DEEP LINKING) UPDATE BROKE DATABASE PLUGIN COMPATIBILITY. THE FOLLOWING PLUGINS CURRENTLY ONLY WORK WITH EARLIER VERSIONS:***


> Alternatively you can use Postgresql database via the [ltijs-postgresql](https://www.npmjs.com/package/ltijs-postgresql) plugin

- [Using PostgreSQL with Ltijs](https://www.npmjs.com/package/ltijs-postgresql)


> Alternatively you can use Firestore database via the [ltijs-firestore](https://github.com/lucastercas/ltijs-firestore) plugin

- [Using Firestore with Ltijs](https://github.com/lucastercas/ltijs-firestore)

***Obs: The officially supported database is MongoDB, the plugins are created by the community and are not mantained by me.***


> Instantiate and use Provider class


```javascript
const path = require('path')

// Require Provider 
const LTI = require('ltijs').Provider

// Configure provider
const lti = new LTI('EXAMPLEKEY', 
            { url: 'mongodb://localhost/database' }, 
            { appRoute: '/', loginRoute: '/login', logger: true })


let setup = async () => {
  // Deploy and open connection to the database
  await lti.deploy({ port: 3000 })

  // Register platform
  let plat = await lti.registerPlatform({ 
    url: 'https://platform.url',
    name: 'Platform Name',
    clientId: 'TOOLCLIENTID',
    authenticationEndpoint: 'https://platform.url/auth',
    accesstokenEndpoint: 'https://platform.url/token',
    authConfig: { method: 'JWK_SET', key: 'https://platform.url/keyset' }
  })

  // Set connection callback
  lti.onConnect((connection, request, response) => {
    // Call redirect function
    lti.redirect(response, '/main')
  })

  // Set main route 
  lti.app.get('/main', (req, res) => {
    // Id token
    console.log(res.locals.token)
    res.send('It\'s alive!')
  })
}
setup()
```



**Register a platform to work with your tool** 
> **[Registering a new platform](#registering-a-new-platform)**

> Checkout the **[Platform class documentation](https://cvmcosta.github.io/ltijs/#/platform)**


**Routing with Ltijs is a bit diferent from regular Express routing so here's an useful tutorial:** 


> **[Understand routing and context with Ltijs](#routing-and-context)**


**If your tool is going to function as a hub serving multiple resources:**

> **[Serving multiple resources](#serving-multiple-resources)**
> Also heckout the **[Deep Linking Service class documentation](https://cvmcosta.github.io/ltijs/#/deeplinking)**

**If your tool is going to send grades to the platform:**
> Checkout the **[Grading Service class documentation](https://cvmcosta.github.io/ltijs/#/grading)**

## Tutorial

You can find a quick tutorial on how to set ltijs up and use it to send grades to a Moodle platform [here](https://medium.com/@cvmcosta2/creating-a-lti-provider-with-ltijs-8b569d94825c).


---

## Documentation

### Provider
>The Ltijs Provider Class

Exposes methods for easy manipualtion of the LTI 1.3 standard as a LTI Provider, an "app" object to manipulate the [Express](https://expressjs.com/) server and a [Mongoose.Connection](https://mongoosejs.com/docs/api/connection.html) "db" object.


#### provider.app
Express server object.

**Type**: ```Express```


#### provider.Database
Database object. Allows you to perform the database operations in the same way the internal code does.

**Type**: ```Database```  


#### provider.Grade
Instance of the [Grade Class](https://cvmcosta.github.io/ltijs/#/grading), implementing the Assignment and Grade service of the LTI 1.3 protocol.

**Type**: ```Grade```

#### provider.DeepLinking
Instance of the [DeepLinking Class](https://cvmcosta.github.io/ltijs/#/deeplinking), implementing the Deep Linking service of the LTI 1.3 protocol.

**Type**: ```DeepLinking```

#### provider.NamesAndRoles
Instance of the [NamesAndRoles Class](https://cvmcosta.github.io/ltijs/#/namesandroles), implementing the Names and Roles Provisioning service of the LTI 1.3 protocol.

**Type**: ```NamesAndRoles```

#### Provider.constructor(encryptionkey, database [, options]) 

Exposes methods for easy manipulation of the LTI 1.3 standard as a LTI Provider and a "app" object to manipulate the [Express](https://expressjs.com/) server.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| encryptionkey | `String`  | Secret used to sign cookies and other info. | &nbsp; |
| database | `Object`  | LTI Provider options. | |
| database.url | `String`  | Database url (Ex: mongodb://localhost/applicationdb). |  |
| database.connection | `Object`  | Database connection options. Can be any option supported by the [MongoDB Driver](http://mongodb.github.io/node-mongodb-native/2.2/api/MongoClient.html#connect) | *Optional* |
| database.connection.user | `String`  | Database user for authentication if needed. | *Optional* |
| database.connection.pass | `String`  | Database pass for authentication if needed. | *Optional* |
| database.plugin | `Object`  | If set, uses the given database plugin instead of the default MongoDB. | *Optional* |
| options | `Object`  | LTI Provider options. | *Optional* |
| options.appRoute | `String`  | = '/'] - Lti Provider main url. If no option is set '/' is used. | *Optional* |
| options.loginRoute | `String`  | = '/login'] - Lti Provider login url. If no option is set '/login' is used. | *Optional* |
| options.sessionTimeoutRoute | `String`  | = '/sessionTimeout'] - Lti Provider session timeout url. If no option is set '/sessionTimeout' is used. | *Optional* |
| options.invalidTokenRoute | `String`  | = '/invalidToken'] - Lti Provider invalid token url. If no option is set '/invalidToken' is used. | *Optional* |
| options.https | `Boolean`  | = false]  Set this as true in development if you are not using any web server to redirect to your tool (like Nginx) as https and are planning to configure ssl locally. ***If you set this option as true you can enable the secure flag in the cookies options***. | *Optional* |
| options.ssl | `Object`  | SSL certificate and key if https is enabled. | *Optional* |
| options.ssl.key | `String`  | SSL key. | *Optional* |
| options.ssl.cert | `String`  | SSL certificate. | *Optional* |
| options.staticPath | `String`  | The path for the static files your application might serve (Ex: _dirname+"/public") | *Optional* |
| options.logger | `Boolean`  | If true, allows Ltijs to generate logging files for server requests and errors. | *Optional* |
| options.cors | `Boolean`  | = true] If false, disable cors. | *Optional* |
| options.serverAddon | `Function` |  Allows the execution of a method inside of the server contructor. Can be used to register middlewares. | *Optional* |
| options.cookies | `Object` | Cookie configuration. Allows you to configure, sameSite and secure parameters. | *Optional* |
| options.cookies.secure | `Boolean` | Cookie secure parameter. If true, only allows cookies to be passed over https. | *Optional* |
| options.cookies.sameSite | `String` | Cookie sameSite parameter. If cookies are going to be set across domains, set this parameter to 'None'. | *Optional* |

#### async Provider.deploy(options) 

Starts listening to a given port for LTI requests and opens connection to the configured database.


##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| options | `Object`  | Deployment options | *Optional* |
| options.port | `Number`  | The port the Provider should listen to. If no value is set, listens to port 3000 | *Optional* |
| options.silent | `Boolean`  | If true, supresses the initial console logs and the graceful shutdown console logs | *Optional* |
| options.serverless | `Boolean`  | If true, Ltijs does not start an Express server instance. This allows usage as a middleware and with services like AWS. Ignores 'port' parameter. | *Optional* |

##### Returns

- Promise that resolves ```true``` when connection to the database is stablished and the server starts listening.




#### async Provider.close() 

Closes connection to database and stops server.


##### Returns

- Promise that resolves ```true``` when it's done or ```false``` if something fails.



#### Provider.onConnect(_connectCallback[, options]) 

Sets the callback function called whenever theres a sucessfull connection, exposing a Conection object containing the id_token decoded parameters.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| _connectCallback | `Function`  | Function that is going to be called everytime a platform sucessfully connects to the provider. | &nbsp; |
| options | `Object`  | Options configuring the usage of cookies to pass the Id Token data to the client. | *Optional* |
| options.sessionTimeout | `Function`  | Route/Function executed everytime the session expires. It must in the end return a 401 status, even if redirects ((req, res, next) => {res.sendStatus(401)}). | *Optional* |
| options.invalidToken | `Function`  | Route/Function executed everytime the system receives an invalid token or cookie. It must in the end return a 401 status, even if redirects ((req, res, next) => {res.sendStatus(401)}). | *Optional* |




##### Examples

```javascript
.onConnect((conection, response)=>{response.send(connection)})
```


#### Provider.onDeepLinking(_connectCallback[, options]) 

Sets the callback function called whenever theres a sucessfull deep linking request connection, exposing a Conection object containing the id_token decoded parameters. Through this callback you can display your Deep Linking view.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| _deepLinkingCallback | `Function`  | Function that is going to be called everytime a platform sucessfully launches a deep linking request. | &nbsp; |
| options | `Object`  | Options configuring the usage of cookies to pass the Id Token data to the client. | *Optional* |
| options.sessionTimeout | `Function`  | Route/Function executed everytime the session expires. It must in the end return a 401 status, even if redirects ((req, res, next) => {res.sendStatus(401)}). | *Optional* |
| options.invalidToken | `Function`  | Route/Function executed everytime the system receives an invalid token or cookie. It must in the end return a 401 status, even if redirects ((req, res, next) => {res.sendStatus(401)}). | *Optional* |




##### Examples

```javascript
.onDeepLinking((conection, response)=>{response.send(connection)})
```




#### Provider.loginRoute() 

Gets the login Url responsible for dealing with the OIDC login flow.



##### Examples

```javascript
provider.loginRoute()
```




#### Provider.appRoute() 

Gets the main application Url that will receive the final decoded Idtoken.





##### Examples

```javascript
provider.appRoute()
```





#### Provider.sessionTimeoutRoute() 

Gets the session timeout Url that will be called whenever the system encounters a session timeout.



##### Examples

```javascript
provider.sessionTimeoutRoute()
```




#### Provider.invalidTokenRoute() 

Gets the invalid token Url that will be called whenever the system encounters a invalid token or cookie.





##### Examples

```javascript
provider.invalidTokenRoute()
```




#### Provider.keysetRoute() 

Gets the public JWK keyset Url.





##### Examples

```javascript
provider.keysetRoute()
```

#### Provider.whitelist(urls)
Whitelists Urls to bypass the lti 1.3 authentication protocol. These Url dont have access to an idtoken.



| Param | Type | Description |
| --- | --- | --- |
| urls | <code>String</code> | Urls to be whitelisted. Optionally you can pass an object containing the route and the specific method. |

##### Examples

```javascript
provider.whitelist('/log', '/home')
provider.whitelist('/log', '/home', '/route')
provider.whitelist('/log', '/home', { route: '/route', method: 'POST' })
```



#### async Provider.registerPlatform(Url, name, clientId, authenticationEndpoint, authConfig) 

Registers a [Platform](platform.md).


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


 - Promise that resolves a [Platform](platform.md) object if it succeeds and ```false``` if it fails.



#### async Provider.getPlatform(url) 

Gets a [Platform](platform.md).




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| url | `String`  | Platform url. | &nbsp; |




##### Returns


- Promise that resolves a [Platform](platform.md) object if it succeeds and ```false``` if it fails.



#### async Provider.deletePlatform(url) 

Deletes a [Platform](platform.md).



##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| url | `String`  | Platform url. | &nbsp; |


##### Returns

- Promise that resolves ```false``` if it fails.

#### async Provider.getAllPlatforms() 

Gets all [platforms](platform.md).



##### Returns


- Promise that resolves a [Platform](platform.md) object array if it succeeds and ```false``` if it fails.




#### async Provider.redirect(response, path [, options]) 

Redirects to another route, handles the context in the url and if the route is a specific resource, generates the context cookie for it.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| response | `Object`  | Espress response object.| &nbsp; |
| path | `String`  | Redirect path. | &nbsp; |
| [options] | <code>Object</code> |  Redirection options | *Optional* |
| [options.isNewResource] | <code>Boolean</code> | If true creates new resource and its cookie | *Optional* |
| [options.ignoreRoot] | <code>Boolean</code> |  If true deletes de main path (/) database tokenb on redirect, this saves storage space and is recommended if you are using your main root only to redirect | *Optional* |

**Example**  
```js
lti.generatePathCookie(response, '/path', { isNewResource: true })
```

---
## Usage

### Setting up provider

#### Require the package

``` javascript
const LTI = require('ltijs').Provider
```


#### Instantiate a new LTI Object

```javascript
//Configure provider
const lti = new LTI('EXAMPLEKEY', 
            { url: 'mongodb://localhost/database', 
              connection:{ user:'user',
                          pass: 'pass'} 
            }, 
            { staticPath: path.join(__dirname, '/views/') })
```
The second parameter of the contructor, `database`, is an object with an `url` field, that should be the database url, and, if needed, a `connection` field, that must contain [MongoDB Driver's connection options](http://mongodb.github.io/node-mongodb-native/2.2/api/MongoClient.html#connect), like authentication information.


The third parameter, `options`, allows you to configure a staticPath from where the express server serves static files, setup a local https configuration, setup the server logger, customize the server main routes, and configure cookie parameters: 


```javascript
const lti = new LTI('EXAMPLEKEY', 
            { url: 'mongodb://localhost/database', 
              connection:{ user:'user',
                          pass: 'pass'} 
            }, 
            { appRoute: '/', loginRoute: '/login', 
              staticPath: path.join(__dirname, '/views/'),
              https: true, 
              ssl: { key: privateKey, 
                     cert: certificate 
                   },
              cookies: {
                secure: true, // Cookies will only be passed through https.
                sameSite: 'None' // Cookies can be set across domains.
              }
            })

```

***Obs: If sameSite is defined as 'None', the secure flag is automatically set to true, that is done because browsers do not accept cookies with sameSite set to 'None' that are not also set as secure.***


### The Provider object

You can configure the main routes (login, main app, session timeout, invalid token, keyset): 


##### Setting custom main routes


```javascript
//Configure provider
const lti = new LTI('EXAMPLEKEY', 
            { url: 'mongodb://localhost/database', 
              connection:{ user:'user',
                          pass: 'pass'} 
            }, 
            { appRoute: '/main', 
              loginRoute: '/login', 
              sessionTimeoutRoute: '/sessionTimeout', 
              invalidTokenRoute: '/invalidToken',
              keysetRoute: '/keys' })
```

If no routes are specified the system defaults to:

```javascript
appRoute = '/'
loginRoute = '/login'
sessionTimeoutRoute = '/sessionTimeout'
invalidTokenRoute = '/invalidToken'
keysetRoute = '/keys'
```

##### Serving static files

Express allows you to specify a path from where static files will be served.

Ltijs can use this functionality by setting the staticPath parameter of the constructor's additional options. 

```javascript
//Configure provider
const lti = new LTI('EXAMPLEKEY', 
            { url: 'mongodb://localhost/database', 
            }, 
            { staticPath: 'public' })
```


#### Deploy

Deploying the application opens a connection to the configured database and starts the express server.

```javascript
await lti.deploy() // resolves false if it fails
```

The `deploy` method accepts a object containing the `port` and `silent` configurations.


```javascript
await lti.deploy({ port: 3000, silent: false })
```

The default values for these configurations are respectively `3000 and false`.

If set to `true`, the `silent` option supressess the default console logs that occurs during the startup and graceful shutdown routines.

##### Deploying the application as part of another server

You can use Ltijs as a middleware by calling the deploy method with the serverless flag set to true. *Theoretically this also allows you to use Ltijs with AWS or other similar services.*

```javascript
const app = express()
const lti = new LTI('EXAMPLEKEY', { url: 'mongodb://localhost/database' })

// Start LTI provider in serverless mode
await lti.deploy({serverless: true})

// Mount Ltijs express app into preexisting express app with /lti prefix
app.use('/lti', lti.app)
```

#### The onConnect() method

The `onConnect()` method is called whenever a request successfully arrives at the main app url, and you can specify the callback function that is called. 

Outside of it's first argument `connection`, that is the user's validated `idtoken`, the callback function will be given the three main Express route parameters (req, res, next).

> The **[idtoken](#idtoken)** can also be found in the **response.locals.token** object.

```javascript
lti.onConnect(
  (conection, request, response, next) => {
    response.send('User connected!')
  }
)
```



##### Options

The method also allows you to specify sessionTimeOut and invalidToken route functions to handle these cases.

```javascript
lti.onConnect(
  (conection, request, response,  next) => {
    response.send('User connected!')
  }, {
    sessionTimeout: (req, res) => { res.send('Session timed out') }, 
    invalidToken: (req, res) => { res.send('Invalid token') } 
  }
)
```

#### The app property

The LTI object gives you a `app` property that is an instance of the Express server, through this property you can create routes just like with regular [Express](https://expressjs.com/).

```javascript
lti.app.get('/stuff', (req,res,next) => {
  res.send('Here\'s yo stuff!')
})
```


### Keyset Endpoint

In order to make it easier to register your tool with any LMS, Ltijs gives you a public JWK keyset endpoint, where platforms such as Canvas can retrieve their correspondent JWK public key.

By default the publick keyset endpoint is `/keys` and it returns a keyset containig every public key registered within the tool.

You can change the path to this route in the constructor options for ltijs.


```javascript
//Configure provider
const lti = new LTI('EXAMPLEKEY', 
            { url: 'mongodb://localhost/database', 
              connection:{ user:'user',
                          pass: 'pass'} 
            }, 
            {  keysetRoute: '/keyset' }) // Changed from '/keys' to '/keyset'
```

### Server addon support

Ltijs allows you to setup custom middlewares or change the initial server condfiguration directly anyway you want through the `serverAddon` option that receives a function with access to the Express `app` object:

```javascript
const middleware = (app) => {
  app.use(async (req, res, next) => {
    console.log('Middleware works!')
    next()
  })
}

//Configure provider
const lti = new LTI('EXAMPLEKEY', 
            { url: 'mongodb://localhost/database', 
              connection:{ user:'user',
                          pass: 'pass'} 
            }, 
            {  serverAddon: middleware }) // Passing addon function
```

The code within `middleware` will be executed at the end of the server constructor and before any route is registered.

---

### The Platform object

A LTI tool works in conjunction with an LTI ready platform, so in order for a platform to display your tool's resource, it needs to first be registered in the tool.

#### Registering a new Platform

The [LTI Provider](provider.md) method `registerPlatform()` returns a Promise that resolves the created `Platform` or `false` if some error occurs.

```javascript
let plat = await lti.registerPlatform({ 
    url: 'https://platform.url',
    name: 'Platform Name',
    clientId: 'TOOLCLIENTID',
    authenticationEndpoint: 'https://platform.url/auth',
    accesstokenEndpoint: 'https://platform.url/token',
    authConfig: { method: 'JWK_SET', key: 'https://platform.url/keyset' }
})
```
This function returns a [Platform](platform.md) object.

**If the platform is already registered and you pass different values for the parameters, the configuration of the registered platform will be updated:**

```javascript
let plat = await lti.registerPlatform({ 
    url: 'https://platform.url',
    name: 'Platform Name 2', // Changing the name of already registered platform
    authenticationEndpoint: 'https://platform.url/auth2' // Changing the authEndpoint of already registered platform
})
```


##### The authConfig property

Controls how the tool authenticates messages coming from the platform.

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

## Logging and Debugging

### Logging

**Ltijs** generates error and server logs if the logger parameter of the constructor's additional options is set to true.

```javascript
// Configure provider
const lti = new LTI('EXAMPLEKEY', 
            { url: 'mongodb://localhost/database'
            }, 
            { logger: true })
```

Logs will be generated inside a `logs` folder in the root of your project.


### Debugging


**Ltijs** uses [debug](https://www.npmjs.com/package/debug) to log various events in the console. Just append `DEBUG='provider:*'` before yout node or npm command and it should be working.

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
