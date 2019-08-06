<div align="center">
	<br>
	<br>
	<a href="https://cvmcosta.github.io/ltijs"><img width="360" src="logo-300.svg"></img></a>
</div>



> Turn your application into a LTI 1.3 tool provider.


[![travisci](https://img.shields.io/travis/cvmcosta/ltijs.svg)](https://travis-ci.org/Cvmcosta/ltijs)
[![codecov](https://codecov.io/gh/Cvmcosta/ltijs/branch/master/graph/badge.svg)](https://codecov.io/gh/Cvmcosta/ltijs)
[![Node Version](https://img.shields.io/node/v/ltijs.svg)](https://www.npmjs.com/package/ltijs)
[![NPM package](https://img.shields.io/npm/v/ltijs.svg)](https://www.npmjs.com/package/ltijs)
[![NPM downloads](https://img.shields.io/npm/dm/ltijs)](https://www.npmjs.com/package/ltijs)
[![dependencies Status](https://david-dm.org/cvmcosta/ltijs/status.svg)](https://david-dm.org/cvmcosta/ltijs)
[![devDependencies Status](https://david-dm.org/cvmcosta/ltijs/dev-status.svg)](https://david-dm.org/cvmcosta/ltijs?type=dev)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![APACHE2 License](https://img.shields.io/github/license/cvmcosta/ltijs)](#LICENSE)



| Feature | Implementation | Documentation |
| --------- | - | - |
| Provider | <center>:heavy_check_mark:</center> | <center>:heavy_check_mark:</center> |
| [Platform Class](platform.md) | <center>:heavy_check_mark:</center> | <center>:heavy_check_mark:</center> |
| Grade Service Class | <center>:heavy_check_mark:</center> | <center></center> |
| Keyset endpoint support | <center></center> | <center></center> |
| Names and Roles Service Class | <center></center> | <center></center> |
| Database plugins | <center></center> | <center></center> |


## Table of Contents

- [Introduction](#introduction)
- [Example](#example)
- [Documentation](#documentation)
- [Usage](#usage)
  - [Setting up provider](#setting-up-provider)
  - [The Provider object](#the-provider-object)
  - [Deploy and the onConnect() Callback](#deploy)
  - [The Platform object](#the-platform-object)
  - [The idToken object](#the-idtoken-object)
  - [Routing and Context](#routing-and-context)
- [Provider Grading Services](#provider-grading-services)
  - [Sending Grades to platform](#sending-grades-to-a-platform)
  - [Retrieving Grades from a platform](#retrieving-grades-from-a-platform)
- [Debugging](#debugging)
- [Contributing](#contributing)
- [License](#license)

---
## Introduction
According to the [IMS Global Learning Consortium](https://www.imsglobal.org/), a  LTI tool Provider is the external application or service providing functionality to the consumer [platform](platform.md). <sup>[ref](https://www.imsglobal.org/spec/lti/v1p3/#platforms-and-tools)</sup>


This package implements a tool provider as an [Express](https://expressjs.com/) server, with preconfigured routes and methods that manage the [LTI 1.3](https://www.imsglobal.org/spec/lti/v1p3/) protocol for you. Making it fast and simple to create a working learning tool without having to worry about manually implementing any of the security and validation required to do so. 

#### Other documentations
- [Platform Class documentation](platform.md)
- ~~Provider Grade Service documentation~~


---

## Examples

Example of provider usage

> Install this package

```shell
$ npm install ltijs
```

> Install mongoDB. LTIjs  uses mongodb to store and manage information

 - [Installing mongoDB](https://docs.mongodb.com/manual/administration/install-community)


> Instantiate and use Provider class


```javascript
const path = require('path')

// Require Provider 
const LTI = require('ltijs').Provider

// Configure provider
const lti = new LTI('EXAMPLEKEY', 
            { url: 'mongodb://localhost/database', 
              connection:{ user:'user',
                          pass: 'pass'} 
            }, 
            { appUrl: '/', loginUrl: '/login', staticPath: path.join(__dirname, '/views/') })


let setup = async () => {
  // Deploy and open connection to the database
  await lti.deploy()

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

  // Set route accounting for issuer context
  lti.app.get('/:iss/main', (req, res) => {
    // Id token
    console.log(res.locals.token)
    res.send('It\'s alive!')
  })
}
setup()
```



**Register a platform to work with your tool** 
> **[Registering a new platform](#registering-a-new-platform)**

> And checkout the **[Platform class documentation](platform.md)**


**Routing with LTIjs is a bit diferent from regular Express routing  so here's a useful tutorial:** 


> **[Understand routing and context with LTIjs](#routing-and-context)**


**If your tool is going to function as a hub serving multiple resources:**

> **[Serving multiple resources](#serving-multiple-resources)**

For more examples:

> ~~**Check examples folder on Github**~~

---

## Documentation

### Provider
>The LTIjs Provider Class

Exposes methods for easy manipualtion of the LTI 1.3 standard as a LTI Provider, an "app" object to manipulate the [Express](https://expressjs.com/) server and a [Mongoose.Connection](https://mongoosejs.com/docs/api/connection.html) "db" object.


#### provider.db
Database connection object.

**Type**: ```Mongoose.Connection```  


#### provider.app
Express server object.

**Type**: ```Express```

#### provider.Grade
Instance of the [Grade Class](provider_grade.md), representing the Assignment and Grade service of the LTI 1.3 protocol.

**Type**: ```Grade```

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
| options | `Object`  | LTI Provider options. | *Optional* |
| options.appUrl | `String`  | = '/'] - Lti Provider main url. If no option is set '/' is used. | *Optional* |
| options.loginUrl | `String`  | = '/login'] - Lti Provider login url. If no option is set '/login' is used. | *Optional* |
| options.sessionTimeoutUrl | `String`  | = '/sessionTimeout'] - Lti Provider session timeout url. If no option is set '/sessionTimeout' is used. | *Optional* |
| options.invalidTokenUrl | `String`  | = '/invalidToken'] - Lti Provider invalid token url. If no option is set '/invalidToken' is used. | *Optional* |
| options.https | `Boolean`  | = false]  Set this as true in development if you are not using any web server to redirect to your tool (like Nginx) as https. ***If you set this option as true you can enable the secure flag in the cookies options of the onConnect method***. | *Optional* |
| options.ssl | `Object`  | SSL certificate and key if https is enabled. | *Optional* |
| options.ssl.key | `String`  | SSL key. | *Optional* |
| options.ssl.cert | `String`  | SSL certificate. | *Optional* |
| options.staticPath | `String`  | The path for the static files your application might serve (Ex: _dirname+"/public") | *Optional* |




#### async Provider.deploy(port) 

Starts listening to a given port for LTI requests and opens connection to the configured database.


##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| port | `number`  | The port the Provider should listen to | &nbsp; |


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
| options.secure | `Boolean`  | = false] - Secure property of the cookie. | *Optional* |
| options.sessionTimeout | `Function`  | Route/Function executed everytime the session expires. It must in the end return a 401 status, even if redirects ((req, res, next) => {res.sendStatus(401)}). | *Optional* |
| options.invalidToken | `Function`  | Route/Function executed everytime the system receives an invalid token or cookie. It must in the end return a 401 status, even if redirects ((req, res, next) => {res.sendStatus(401)}). | *Optional* |




##### Examples

```javascript
.onConnect((conection, response)=>{response.send(connection)}, {secure: true})
```



#### Provider.loginUrl() 

Gets the login Url responsible for dealing with the OIDC login flow.



##### Examples

```javascript
provider.loginUrl()
```




#### Provider.appUrl() 

Gets the main application Url that will receive the final decoded Idtoken.





##### Examples

```javascript
provider.appUrl()
```





#### Provider.sessionTimeoutUrl() 

Gets the session timeout Url that will be called whenever the system encounters a session timeout.



##### Examples

```javascript
provider.sessionTimeoutUrl()
```




#### Provider.invalidTokenUrl() 

Gets the invalid token Url that will be called whenever the system encounters a invalid token or cookie.





##### Examples

```javascript
provider.invalidTokenUrl()
```

#### Provider.whitelist(urls)
Whitelists Urls to bypass the lti 1.3 authentication protocol. These Url dont have access to an idtoken.



| Param | Type | Description |
| --- | --- | --- |
| urls | <code>Array&lt;String&gt;</code> | Array containing the urls to be whitelisted |

##### Examples

```javascript
provider.whitelist(['/log', '/home'])
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
The second parameter of the contructor, `database`, is an object with an `url` field, that should be the database url, and a `connection` field, that must contain [MongoDB Driver's connection options](http://mongodb.github.io/node-mongodb-native/2.2/api/MongoClient.html#connect).


The third parameter, `options`, allows you to configure a staticPath from where the server serves static files, as well as setup a server using https: 


##### Using ssl


```javascript
const lti = new LTI('EXAMPLEKEY', 
            { url: 'mongodb://localhost/database', 
              connection:{ user:'user',
                          pass: 'pass'} 
            }, 
            { staticPath: path.join(__dirname, '/views/'),
              https: true, 
              ssl: { key: privateKey, 
                     cert: certificate 
                   },
            })

```



#### The Provider object

You can configure the main routes (login, main app, session timeout, invalid token) through the given methods: 


##### Setting custom main routes


```javascript
//Configure provider
const lti = new LTI('EXAMPLEKEY', 
            { url: 'mongodb://localhost/database', 
              connection:{ user:'user',
                          pass: 'pass'} 
            }, 
            { appUrl: '/main', 
              loginUrl: '/login', 
              sessionTimeoutUrl: '/sessionTimeout', 
              invalidTokenUrl: '/invalidToken' })
```

If no routes are specified the system defaults to:

```javascript
appUrl = '/'
loginUrl = '/login'
sessionTimeoutUrl = '/sessionTimeout'
invalidTokenUrl = '/invalidToken'
```
***These functions must be called before `deploy()`, otherwise the changed will not be applied.***


### Deploy

Deploying the application opens a connection to the configured database and starts the express server.

```javascript
await lti.deploy() // resolves false if it fails
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

The method also allows you to configure a few things regarding to how the idtoken cookie is handled, and specify sessionTimeOut and invalidToken route functions to handle these cases.

```javascript
lti.onConnect(
  (conection, request, response,  next) => {
    response.send('User connected!')
  }, {
    secure: true, // Cookie is only passed through secure https requests
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
This function returns a [Platform](platform.md) object

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
lti.app.get('/:iss/route', (req, res) => {
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

---

### Routing and context

Your tool can be used with an unlimited amount of platforms, that is the idea behind LTI, so it needs a way to track which platform and resource is currently being accessed and return the correct token information relevant to each context.

In **LTIjs** this is done matching the context url with it's corresponding session cookies stored in the user's browser.

- Url context formatting

**<center>DOMAIN / platPLATFORM_ID / PATH</center>**

- Corresponding cookies

**<center>platPLATFORM_ID</center>**
**<center>platPLATFORM_ID/</center>**




> As you can see there is more than one cookie stored, that is because LTIjs also keeps track of multiple activities linked to the tool within a same platform, so the path specific cookie keeps track of activity specific information, like custom parameters, that might point to a specific resource.


The PLATFORM_ID is a url encoded base64 value that represents a platform url, this value is automatically generated and prepended to the PATH when the `redirect()` function is called:


```javascript
lti.onConnect((connection, request, response) => {
  // Call redirect function
  lti.redirect(response, '/main') // Redirects to http://provider/PLATFORM_ID/main
})
```


The previous call generates the following cookies:

**<center>platPLATFORM_ID</center>**
**<center>platPLATFORM_ID/</center>**


> **But if i redirected to /main why is there no platPLATFORM_ID/main cookie set?**

#### Serving multiple resources

That happens because the call `lti.redirect(response, '/main')`, doesn't specify that the `/main` path is a specific resource inside the provider, so a request to `/main` will work within the context of `platPLATFORM_ID/` as a subroute.

- If you want to specify that the call to `/main` should work within the context of a new resource you just have to set the ```isNewResource``` property of the options parameter of `lti.rediret()` as `true`:


```javascript
lti.onConnect((connection, request, response) => {
  // Call redirect function
  lti.redirect(response, '/main', { isNewResource: true }) // Redirects to http://provider/PLATFORM_ID/main within a new context
})
```


The previous call generates the following cookies:

> Platform context info 

**<center>platPLATFORM_ID</center>**

> Most recent request context info

**<center>platPLATFORM_ID/</center>**

> Route specific context info

**<center>platPLATFORM_ID/main</center>**


If you don't want to have a cookie representing the ```\``` route (if you are not using the ```\``` route for anything except redirecting, for example), you can set the ```ignoreRoot``` property of the options parameter of `lti.rediret()` as `true`: 

```javascript
lti.onConnect((connection, request, response) => {
  // Call redirect function
  lti.redirect(response, '/main', { isNewResource: true, ignoreRoot: true }) // Redirects to http://provider/PLATFORM_ID/main within a new context
})
```

Then the cookie representing the ```\``` route wont be generated:

> Platform context info 

**<center>platPLATFORM_ID</center>**

> Route specific context info

**<center>platPLATFORM_ID/main</center>**




And now calls to the `http://provider/PLATFORM_ID/main` url will get the information from these cookies, assemble a **IdToken** and pass it to the request handler (`lti.app.get('/:iss/main')`).



> **How do i handle these redirects?**

#### Routes

Because of how the context system works, a redirect to `/main`, **wont be handled by a regular `lti.app.get('/main')` route**, instead you **MUST** prepend **`/:iss`** to the handled path so that the route takes into account the platform context 

```javascript
lti.app.get('/:iss/main', (req, res) => { // Handles requests to /main
  console.log(res.locals.token)
})
```

You **can** make requests to regular routes if you send in the request the query parameter `context` containing the path context information, so that the request can validated it and return to the route the correct context idtoken.

**<center>http://provider/getidtoken?context=/platPLATFORM_ID/PATH</center>**

> With javascript you can easily get this information in the client by calling **window.location.pathname**

##### Making requests from the client

The client can call regular routes to get information from the provider by passing the query parameter `context` containing the path context information as described above, failing to do so will return a **400 bad request status**.

> Example request from the client:

```javascript
let context = window.location.pathname
got.get('https://provider/gettoken?context=' + context, (err, response)=>{
    if(err){
      console.log(err)
      return false
    }else{
      console.log(response)
    }
})
```

##### Whitelisted routes

You can whitelist routes to bypass the LTI 1.3 security protocol, but these routes won't have access to an idToken.


```javascript
lti.whitelist(['/main', '/home'])
```

Now calls to ```/main``` will be handled by `lti.app.get('/main')` and will not have access to an idToken.


---
### Provider Grading Services

LTIjs implements the [LTI 1.3 Assignment and Grading Service Specification](https://www.imsglobal.org/spec/lti-ags/v2p0/) in the form of the [Grade Class](provider_grade.md).

#### Sending grades to a platform

LTIjs is able to send grades to a platform in the [application/vnd.ims.lis.v1.score+json](https://www.imsglobal.org/spec/lti-ags/v2p0/#score-publish-service) LTI standard:

```javascript
{
  "scoreGiven" : 83,
  "comment" : "This is exceptional work.",
  "activityProgress" : "Completed",
  "gradingProgress": "FullyGraded"
}
```

> This excludes the fields *timestamp*, *userId* and *scoreMaximum* of the specification, because the *messagePlatform()* function fills them automatically using the idtoken passed


Sending the grade: 

```javascript
let grade = {
  scoreGiven: 50,
  activityProgress: 'Completed',
  gradingProgress: 'FullyGraded'
}

// Sends a grade to a platform's grade line
lti.Grade.ScorePublish(res.locals.token, grade)
```



#### Retrieving grades from a platform

LTIjs is able to retrieve grades from a platform:

```javascript
// Retrieves grade from a platform's grade line only for the current user
let result  = await lti.Grade.Result(res.locals.token, { userId: true })
```


---

## Debugging


**LTIjs** uses [debug](https://www.npmjs.com/package/debug) to log various events in the console. Just append `DEBUG='provider:*'` before yout node or npm command and it should be working.

```shell
DEBUG='provider:*' npm start
```

---


## Contributing


If you find a bug or think that something is hard to understand feel free to open an issue or contact me on twitter [@cvmcosta](https://twitter.com/cvmcosta) :)

I'm currently working on turning the Database stuff into a more plugin-like structure to allow the use of other types of database easely. *(And because someone reuploaded the entire repository changing the database to postgres, which is obsviously not the most ethical way to contribute to this project. So i want to make it easy for someone to improve and add things without having to do this sort of uncool stuff)*



---

## License

[![APACHE2 License](https://img.shields.io/github/license/cvmcosta/ltijs)](LICENSE)
