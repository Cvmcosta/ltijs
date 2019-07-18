# [LTIjs](README.md) - Provider

> Turn your application into a LTI 1.3 tool.


[![travisci](https://img.shields.io/travis/cvmcosta/ltijs.svg)](https://travis-ci.org/Cvmcosta/ltijs)
[![codecov](https://codecov.io/gh/Cvmcosta/ltijs/branch/master/graph/badge.svg)](https://codecov.io/gh/Cvmcosta/ltijs)
[![Node Version](https://img.shields.io/node/v/ltijs.svg)](https://www.npmjs.com/package/ltijs)
[![NPM package](https://img.shields.io/npm/v/ltijs.svg)](https://www.npmjs.com/package/ltijs)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![MIT License](https://img.shields.io/github/license/Cvmcosta/ltijs.svg)](LICENSE)


## Table of Contents

- [Introduction](#introduction)
- [Example](#example)
- [Documentation](#documentation)
- [Usage](#usage)
- [License](#license)

---
## Introduction
According to the [IMS Global Learning Consortium](https://www.imsglobal.org/), a  LTI tool Provider is the external application or service providing functionality to the consumer [platform](platform.md). <sup>[ref](https://www.imsglobal.org/spec/lti/v1p3/#platforms-and-tools)</sup>


This package implements a tool provider as an [Express](https://expressjs.com/) server, with preconfigured routes and methods that manage the [LTI 1.3](https://www.imsglobal.org/spec/lti/v1p3/) protocol for you. Making it fast and simple to create a working learning tool without having to worry about manually implementing any of the security and validation required to do so. 


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
            { staticPath: path.join(__dirname, '/views/') })


let setup = async () => {
  // Configure main routes
  lti.appUrl('/')
  lti.loginUrl('/login')

  // Deploy and open connection to the database
  await lti.deploy()

  // Register platform
  let plat = await lti.registerPlatform(
    'http://platform/url', 
    'Platform Name', 'ClientIdThePlatformCreatedForYourApp', 
    'http://platform/AuthorizationUrl', 
    'http://platform/AccessTokenUrl', 
    { method: 'JWK_SET', key: 'http://platform/keyset' }
  )

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

**Sending grades to a platform:**

> **[Sending grades](#sending-grades-to-a-platform)**

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




#### Provider.loginUrl(url) 

Gets/Sets login Url responsible for dealing with the OIDC login flow. If no value is set "/login" is used.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| url | `String`  | Login url. | &nbsp; |




##### Examples

```javascript
provider.loginUrl('/login')
```




#### Provider.appUrl(url) 

Gets/Sets main application Url that will receive the final decoded Idtoken. If no value is set "/" (root) is used.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| url | `String`  | App url. | &nbsp; |




##### Examples

```javascript
provider.appUrl('/app')
```





#### Provider.sessionTimeoutUrl(url) 

Gets/Sets session timeout Url that will be called whenever the system encounters a session timeout. If no value is set "/sessionTimeout" is used.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| url | `String`  | Session timeout url. | &nbsp; |




##### Examples

```javascript
provider.sessionTimeoutUrl('/sesstimeout')
```




#### Provider.invalidTokenUrl(url) 

Gets/Sets invalid token Url that will be called whenever the system encounters a invalid token or cookie. If no value is set "/invalidToken" is used.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| url | `String`  | Invalid token url. | &nbsp; |




##### Examples

```javascript
provider.invalidTokenUrl('/invtoken')
```





#### async Provider.registerPlatform(Url, name, clientId, authenticationEndpoint, authConfig) 

Registers a [Platform](platform.md).


##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| url | `String`  | Platform url. | &nbsp; |
| name | `String`  | Platform nickname. | &nbsp; |
| clientId | `String`  | Client Id generated by the platform. | &nbsp; |
| authenticationEndpoint | `String`  | Authentication endpoint that the tool will use to authenticate within the platform. | &nbsp; |
| authConfig | `Object`  | Authentication method and key for verifying messages from the platform. {method: "RSA_KEY", key:"PUBLIC KEY..."} | &nbsp; |
| authConfig.method | `String`  | Method of authorization "RSA_KEY" or "JWK_KEY" or "JWK_SET". | &nbsp; |
| authConfig.key | `String`  | Either the RSA public key provided by the platform, or the JWK key, or the JWK keyset address. | &nbsp; |




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


#### async Provider.messagePlatform(idToken, message) 

Sends a grade message to [Platform](platform.md).




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| idToken | `Object`  | Connection token.| &nbsp; |
| message | `Object`  | Grade message following the [application/vnd.ims.lis.v1.score+json](https://www.imsglobal.org/spec/lti-ags/v2p0/#score-publish-service) LTI 1.3 standard. | &nbsp; |



##### Returns

- Promise that resolves ```true``` if it succeeds and ```false``` if it fails.


#### async Provider.redirect(response, path [, isNewResource]) 

Redirects to another route, handles the context in the url and if the route is a specific resource, generates the context cookie for it.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| response | `Object`  | Espress response object.| &nbsp; |
| path | `String`  | Redirect path. | &nbsp; |
| isNewResource | `Boolean`  | = false] Set to true if path is a resource, the tool will create a new context cookie. | *Optional* |


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



#### Working with the LTI object

You can configure the main routes (login, main app, session timeout, invalid token) through the given methods: 


##### Setting custom main routes


```javascript
lti.appUrl('/') // Main route that calls the onConnect() callback.
lti.loginUrl('/login') // Login Url used by a platform to initiate the oidc login flow used by LTI 1.3.
lti.sessionTimeoutUrl('/sessionTimeOut') // Route called when the session cookie for the platform expires.
lti.invalidTokenUrl('/invalidToken')  // Route called when the system fails to validate token or cookie passed.
```

If no routes are specified the system defaults to:

```javascript
appUrl = '/'
loginUrl = '/login'
sessionTimeoutUrl = '/sessionTimeout'
invalidTokenUrl = '/invalidToken'
```
***These functions must be called before `deploy()`, otherwise the changed will not be applied.***


#### Deploy

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
  (conection, response, request, next) => {
    response.send('User connected!')
  }
)
```

The method also allows you to configure a few things regarding to how the idtoken cookie is handled, specify sessionTimeOut and invalidToken route functions to handle these cases.

```javascript
lti.onConnect(
  (conection, response, request, next) => {
    response.send('User connected!')
  },{
    secure: true, // Cookie is only passed through secure https requests
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

### The [Platform](platform.md) object

A LTI tool works in conjunction with an LTI ready platform, so in order for a platform to display your tool's resource, it needs to first be registered in the tool.

#### Registering a new Platform

The [LTI Provider](provider.md) method `registerPlatform()` returns a Promise that resolves the created `Platform` or `false` if some error occurs.

```javascript
let plat = await lti.registerPlatform(
  'http://platform/url', 
  'Platform Name', 'ClientIdThePlatformCreatedForYourApp', 
  'http://platform/AuthorizationUrl', 
  'http://platform/AccessTokenUrl', 
  { method: 'JWK_SET', key: 'http://platform/keyset' }
)
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

- If you want to specify that the call to `/main` should work within the context of a new resource you just have to set the third parameter of `lti.rediret()` as `true`:


```javascript
lti.onConnect((connection, request, response) => {
  // Call redirect function
  lti.redirect(response, '/main', true) // Redirects to http://provider/PLATFORM_ID/main within a new context
})
```


The previous call generates the following cookies:

> Platform context info 

**<center>platPLATFORM_ID</center>**

> Most recent request context info

**<center>platPLATFORM_ID/</center>**

> Route specific context info

**<center>platPLATFORM_ID/main</center>**


And now calls to the `http://provider/PLATFORM_ID/main` url will get the information from these cookies, assemble a **IdToken** and pass it to the request handler (`lti.app.get('/:iss/main')`). 

> **How do i handle these redirects?**

#### Routes

Because of how the context system works, a redirect to `/main`, **wont be handled by a regular `lti.app.get('/main')` route**, instead we **MUST** prepend **`/:iss`** to the handled path so that the route takes into account the platform context 

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



---

### Sending grades to a platform

At the moment LTIjs implements a simple version of the [LTI 1.3 Assignment and Grading Service Specification](https://www.imsglobal.org/spec/lti-ags/v2p0/), being able to send grades to a platform in the [application/vnd.ims.lis.v1.score+json](https://www.imsglobal.org/spec/lti-ags/v2p0/#score-publish-service) LTI standard:

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

lti.messagePlatform(res.locals.token, grade)
```

---

## Debugging


**LTIjs** uses [debug](https://www.npmjs.com/package/debug) to log various events in the console. Just append `DEBUG='provider:*'` before yout node or npm command and it should be working.

```shell
DEBUG='provider:*' npm start
```

---

## License

[![MIT License](https://img.shields.io/github/license/Cvmcosta/ltijs.svg)](LICENSE)

- **[MIT license](http://opensource.org/licenses/mit-license.php)**
