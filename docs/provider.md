# [ltijs](README.md) - Provider

> Turn your application into a lti tool.


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
According to the [IMS Global Learning Consortium](https://www.imsglobal.org/), a  Lti tool Provider is the external application or service providing functionality to the consumer platform. <sup>[ref](https://www.imsglobal.org/spec/lti/v1p3/#platforms-and-tools)</sup>


This package implements a tool provider as an [Express](https://expressjs.com/) server, with preconfigured routes and methods that manage the [Lti 1.3](https://www.imsglobal.org/spec/lti/v1p3/) protocol for you. Making it fast and simple to create a working learning tool without having to worry about manually implementing any of the security and validation required to do so. 


---

## Example

Example of provider usage

> Update and install this package first

```shell
$ npm install ltijs
```

> Install mongoDB

 - [Installing mongoDB](https://docs.mongodb.com/manual/administration/install-community)


> Instantiate and use Provider class


```javascript
const path = require('path')

//Require Provider 
const Lti = require('ltijs').Provider

//Configure provider
const lti = new Lti('EXAMPLEKEY', 
            { url: 'mongodb://localhost/database', 
              connection:{ user:'user',
                          pass: 'pass'} 
            }, 
            { staticPath: path.join(__dirname, '/views/') })


let setup = async () => {
  //Configure main routes
  lti.appUrl('/')
  lti.loginUrl('/login')

  //Deploy and open connection to the database
  lti.deploy()

  //Set connection callback
  lti.onConnect((connection, request, response) => {
    response.send('It\'s alive!')
  })
}
setup()
```

---

## Documentation

### Provider
>The Ltijs Provider Class

Exposes methods for easy manipualtion of the LTI 1.3 standard as a LTI Provider, an "app" object to manipulate the [Express](https://expressjs.com/) server and a [Mongoose.Connection](https://mongoosejs.com/docs/api/connection.html) "db" object.


#### provider.db
Database connection object.

**Type**: ```Mongoose.Connection```  


#### provider.app
Express server object.

**Type**: ```Express```

#### Provider.constructor(encryptionkey, database, [, options]) 

Exposes methods for easy manipualtion of the LTI 1.3 standard as a LTI Provider and a "app" object to manipulate the [Express](https://expressjs.com/) server.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| encryptionkey | `String`  | Secret used to sign cookies and other info. | &nbsp; |
| database | `Object`  | Lti Provider options. | |
| database.url | `String`  | Database url (Ex: mongodb://localhost/applicationdb). |  |
| database.connection | `Object`  | Database connection options. Can be any option supported by the [MongoDB Driver](http://mongodb.github.io/node-mongodb-native/2.2/api/MongoClient.html#connect) | *Optional* |
| database.connection.user | `String`  | Database user for authentication if needed. | *Optional* |
| database.connection.pass | `String`  | Database pass for authentication if needed. | *Optional* |
| options | `Object`  | Lti Provider options. | *Optional* |
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



#### Provider.onConnect(_connectCallback[, options]) 

Sets the callback function called whenever theres a sucessfull connection, exposing a Conection object containing the id_token decoded parameters.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| _connectCallback | `Function`  | Function that is going to be called everytime a platform sucessfully connects to the provider. | &nbsp; |
| options | `Object`  | Options configuring the usage of cookies to pass the Id Token data to the client. | *Optional* |
| options.maxAge | `Number`  | = 1000 * 60 * 60] - MaxAge of the cookie in miliseconds. | *Optional* |
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
| message | `Object`  | Grade message following the [application/vnd.ims.lis.v1.score+json](https://www.imsglobal.org/spec/lti-ags/v2p0/#score-publish-service) Lti standard. | &nbsp; |



##### Returns

- Promise that resolves ```true``` if it succeeds and ```false``` if it fails.


---
## Usage

### Setting up provider

#### Require the package

``` javascript
const Lti = require('ltijs').Provider
```


#### Instantiate a new Lti Object

```javascript
//Configure provider
const lti = new Lti('EXAMPLEKEY', 
            { url: 'mongodb://localhost/database', 
              connection:{ user:'user',
                          pass: 'pass'} 
            }, 
            { staticPath: path.join(__dirname, '/views/') })
```
The second parameter of the contructor, `database`, is an object with an `url` field, that should be the database url, and a `connection` field, that must contain [MongoDB Driver's connection options](http://mongodb.github.io/node-mongodb-native/2.2/api/MongoClient.html#connect).


The third parameter, `options`, allows you to configure a staticPath from where the server serves static files, as well as setup a server using https: 

```javascript
const lti = new Lti('EXAMPLEKEY', 
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



#### Working with the Lti object

You can configure the main routes (login, main app, session timeout, invalid token) through the given methods: 


```javascript
lti.appUrl('/')
lti.loginUrl('/login')
lti.sessionTimeoutUrl('/sessionTimeOut) 
lti.invalidTokenUrl('/invalidToken) 
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

#### The onConnect method

The `onConnect()` method is called whenever a request successfully arrives at the main app url, and you can specify the callback function that is called. 

Outside of it's first argument `connection`, that is the user's validated `idtoken`, the callback function will be given the three main Express route parameters (req, res, next).

> The idtoken is also in the response.locals.token and will be passed on as so if next() is called.

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
    maxAge: 1000 * 60 * 60 // Cookie is alive for an hour
  }
)
```


---


#### The app property

The Lti object gives you a `app` property that is an instance of the Express server, through this property you can create routes and manipulate the server as you please.

```javascript
lti.app.get('/stuff', (req,res,next) => {
  res.send('Here\'s yo stuff!')
})
```

> Now you can [register a new platform](readme.md#usage) to use your tool in. 




## License

[![MIT License](https://img.shields.io/github/license/Cvmcosta/ltijs.svg)](LICENSE)

- **[MIT license](http://opensource.org/licenses/mit-license.php)**
