# [ltijs](https://github.com/Cvmcosta/ltijs#readme) - Provider

> Implements a Lti provider server


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

 - [Installing mongoDB](https://docs.mongodb.com/manual/administration/install-community/)


> Instantiate and use Provider class
```javascript
const path = require('path')

//Require Provider 
const Lti = require('ltijs').Provider

//Configure provider
const lti = new Lti('EXAMPLEKEY', 
            {  
              staticPath: path.join(__dirname, '/views/')
            })

//Configure main routes
lti.appUrl('/')
lti.loginUrl('/login')


//Deploy and set main connection callback
lti.deploy().onConnect((connection, request, response) => {
    response.redirect('/')
})
```

---

## Documentation

### Provider
>The Ltijs Provider Class


#### Provider.constructor(encryptionkey[, options]) 

Exposes methods for easy manipualtion of the LTI 1.3 standard as a LTI Provider and a "app" object to manipulate the [Express](https://expressjs.com/) server.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| encryptionkey | `String`  | - Secret used to sign cookies and other info. | &nbsp; |
| options | `Object`  | - Lti Provider options. | *Optional* |
| options.https | `Boolean`  | = false] - Set this as true in development if you are not using any web server to redirect to your tool (like Nginx) as https. ***If you really dont want to use https, disable the secure flag in the cookies option, so that it can be passed via http***. | *Optional* |
| options.ssl | `Object`  | - SSL certificate and key if https is enabled. | *Optional* |
| options.ssl.key | `String`  | - SSL key. | *Optional* |
| options.ssl.cert | `String`  | - SSL certificate. | *Optional* |
| options.staticPath | `String`  | - The path for the static files your application might serve (Ex: _dirname+"/public") | *Optional* |




#### Provider.deploy(port) 

Starts listening to a given port for LTI requests.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| port | `number`  | - The port the Provider should listen to | &nbsp; |




#### Provider.onConnect(_connectCallback[, options]) 

Sets the callback function called whenever theres a sucessfull connection, exposing a Conection object containing the id_token decoded parameters.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| _connectCallback | `Function`  | - Function that is going to be called everytime a platform sucessfully connects to the provider. | &nbsp; |
| options | `Object`  | - Options configuring the usage of cookies to pass the Id Token data to the client. | *Optional* |
| options.maxAge | `Number`  | = 1000 * 60 * 60] - MaxAge of the cookie in miliseconds. | *Optional* |
| options.secure | `Boolean`  | = true] - Secure property of the cookie. | *Optional* |
| options.sessionTmeout | `Function`  | - Route function executed everytime the session expires. It must in the end return a 401 status, even if redirects ((req, res, next) => {res.sendStatus(401)}). | *Optional* |
| options.invalidToken | `Function`  | - Route function executed everytime the system receives an invalid token or cookie. It must in the end return a 401 status, even if redirects ((req, res, next) => {res.sendStatus(401)}). | *Optional* |




##### Examples

```javascript
.onConnect((conection, response)=>{response.send(connection)}, {secure: true})
```




#### Provider.loginUrl(url) 

Gets/Sets login Url responsible for dealing with the OIDC login flow. If no value is set "/login" is used.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| url | `string`  | - Login url. | &nbsp; |




##### Examples

```javascript
provider.loginUrl('/login')
```




#### Provider.appUrl(url) 

Gets/Sets main application Url that will receive the final decoded Idtoken. If no value is set "/" (root) is used.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| url | `string`  | - App url. | &nbsp; |




##### Examples

```javascript
provider.appUrl('/app')
```





#### Provider.sessionTimeoutUrl(url) 

Gets/Sets session timeout Url that will be called whenever the system encounters a session timeout. If no value is set "/sessionTimeout" is used.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| url | `string`  | - Session timeout url. | &nbsp; |




##### Examples

```javascript
provider.sessionTimeoutUrl('/sesstimeout')
```




#### Provider.invalidTokenUrl(url) 

Gets/Sets invalid token Url that will be called whenever the system encounters a invalid token or cookie. If no value is set "/invalidToken" is used.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| url | `string`  | - Invalid token url. | &nbsp; |




##### Examples

```javascript
provider.invalidTokenUrl('/invtoken')
```





#### Provider.registerPlatform(Url, name, clientId, authenticationEndpoint, authConfig) 

Registers a [Platform](https://github.com/Cvmcosta/ltijs/blob/master/src/Provider/README.md#platform).




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| Url | `string`  | - Platform url. | &nbsp; |
| name | `string`  | - Platform nickname. | &nbsp; |
| clientId | `string`  | - Client Id generated by the platform. | &nbsp; |
| authenticationEndpoint | `string`  | - Authentication endpoint that the tool will use to authenticate within the platform. | &nbsp; |
| authConfig | `object`  | - Authentication method and key for verifying messages from the platform. {method: "RSA_KEY", key:"PUBLIC KEY..."} | &nbsp; |
| authConfig.method | `String`  | - Method of authorization "RSA_KEY" or "JWK_KEY" or "JWK_SET". | &nbsp; |
| authConfig.key | `String`  | - Either the RSA public key provided by the platform, or the JWK key, or the JWK keyset address. | &nbsp; |




##### Returns


 - [Platform](https://github.com/Cvmcosta/ltijs/blob/master/src/Provider/README.md#platform) object



#### Provider.getPlatform(url) 

Gets a [Platform](https://github.com/Cvmcosta/ltijs/blob/master/src/Provider/README.md#platform).




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| url | `string`  | - Platform url. | &nbsp; |




##### Returns


- [Platform](https://github.com/Cvmcosta/ltijs/blob/master/src/Provider/README.md#platform) object.



#### Provider.deletePlatform(url) 

Deletes a [Platform](https://github.com/Cvmcosta/ltijs/blob/master/src/Provider/README.md#platform).




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| url | `string`  | - Platform url. | &nbsp; |



#### Provider.getAllPlatforms() 

Gets all [platforms](https://github.com/Cvmcosta/ltijs/blob/master/src/Provider/README.md#platform).






##### Returns


- [Platform](https://github.com/Cvmcosta/ltijs/blob/master/src/Provider/README.md#platform) object array

#### async Provider.messagePlatform(idToken, message) 

Sends a grade message to [Platform](https://github.com/Cvmcosta/ltijs/blob/master/src/Provider/README.md#platform).




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| idToken | `Object`  | - Connection token.| &nbsp; |
| message | `Object`  | - Grade message following the [application/vnd.ims.lis.v1.score+json](https://www.imsglobal.org/spec/lti-ags/v2p0/#score-publish-service) Lti standard. | &nbsp; |






---
## Usage
### Setting up provider


---

## License

[![MIT License](https://img.shields.io/github/license/Cvmcosta/ltijs.svg)](LICENSE)

- **[MIT license](http://opensource.org/licenses/mit-license.php)**
