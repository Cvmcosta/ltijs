

<div align="center">
	<br>
	<br>
	<a href="https://cvmcosta.github.io/ltijs"><img width="360" src="logo-300.svg"></img></a>
</div>


> Platform class


[![travisci](https://img.shields.io/travis/cvmcosta/ltijs.svg)](https://travis-ci.org/Cvmcosta/ltijs)
[![codecov](https://codecov.io/gh/Cvmcosta/ltijs/branch/master/graph/badge.svg)](https://codecov.io/gh/Cvmcosta/ltijs)
[![Node Version](https://img.shields.io/node/v/ltijs.svg)](https://www.npmjs.com/package/ltijs)
[![NPM package](https://img.shields.io/npm/v/ltijs.svg)](https://www.npmjs.com/package/ltijs)
[![NPM downloads](https://img.shields.io/npm/dm/ltijs)](https://www.npmjs.com/package/ltijs)
[![dependencies Status](https://david-dm.org/cvmcosta/ltijs/status.svg)](https://david-dm.org/cvmcosta/ltijs)
[![devDependencies Status](https://david-dm.org/cvmcosta/ltijs/dev-status.svg)](https://david-dm.org/cvmcosta/ltijs?type=dev)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![APACHE2 License](https://img.shields.io/github/license/cvmcosta/ltijs)](#LICENSE)
[![Donate](https://img.shields.io/badge/Donate-Buy%20me%20a%20coffe-blue)](https://www.buymeacoffee.com/UL5fBsi)

## Table of Contents

- [Introduction](#introduction)
- [Usage](#usage)
- [Documentation](#documentation)
- [License](#license)

---


## Introduction
The ```Platform``` class represents a [LTI Consumer](https://www.imsglobal.org/spec/lti/v1p3/#platforms-and-tools).


---



## Usage

### Registering platform

The [LTI Provider](provider.md) method `registerPlatform()` returns a Promise that resolves the created `Platform` or `false` if some error occurs.

```javascript
await lti.registerPlatform({ 
    url: 'https://platform.url',
    name: 'Platform Name',
    clientId: 'TOOLCLIENTID',
    authenticationEndpoint: 'https://platform.url/auth',
    accesstokenEndpoint: 'https://platform.url/token',
    authConfig: { method: 'JWK_SET', key: 'https://platform.url/keyset' }
})

/*
.
.
.
*/

let plat = await lti.getPlatform('http://platform/url') 

let key = await plat.platformPublicKey()
```



---

## Documentation





#### async Platform.platformName([name]) 

Sets/Gets the platform name.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| name | `String`  | Platform name. | *Optional* |




##### Returns


- Promise that resolves `true` or the `platform name` if it succeeds and `false` if it fails.



#### async Platform.platformUrl([url]) 

Sets/Gets the platform url.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| url | `String`  | Platform url. | *Optional* |




##### Returns


- Promise that resolves `true` or the `platform url` if it succeeds and `false` if it fails.




#### async Platform.platformClientId([clientId]) 

Sets/Gets the platform client id.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| clientId | `String`  | Platform client id. | *Optional* |




##### Returns


- Promise that resolves `true` or the `platform name` if it succeeds and `false` if it fails.




#### async Platform.platformKid() 

Gets the platform key_id.






##### Returns


- `String` representing the platform keys id.



#### async  Platform.platformPublicKey() 

Gets the RSA public key assigned to the platform.






##### Returns


- Promise that resolves the `platform public key` if it succeeds and `false` if it fails.




#### async Platform.platformPrivateKey() 

Gets the RSA private key assigned to the platform.






##### Returns

- Promise that resolves the `platform private key` if it succeeds and `false` if it fails.



#### async Platform.platformAuthConfig(method, key) 

Sets/Gets the platform authorization configurations used to validate it's messages.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| method | `String`  | Method of authorization "RSA_KEY" or "JWK_KEY" or "JWK_SET". | &nbsp; |
| key | `String`  | Either the RSA public key provided by the platform, or the JWK key, or the JWK keyset address. | &nbsp; |




##### Returns



- Promise that resolves `true` or the `platform authentication configuration` if it succeeds and `false` if it fails.




#### async Platform.platformAuthEndpoint([authEndpoint]) 

Sets/Gets the platform authorization endpoint used to perform the OIDC login.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| authEndpoint | `String`  | Platform authorization endpoint. | *Optional* |




##### Returns


- Promise that resolves `true` or the `platform authentication endpoint` if it succeeds and `false` if it fails.




#### async Platform.platformAccessTokenEndpoint([accesstokenEndpoint]) 

Sets/Gets the platform access token endpoint used to authenticate messages to the platform.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| accesstokenEndpoint | `String`  | Platform access token endpoint. | *Optional* |




##### Returns



- Promise that resolves `true` or the `platform access token endpoint` if it succeeds and `false` if it fails.




#### async Platform.platformAccessToken(scopes) 

Gets the platform access token or attempts to generate a new one.



##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| scopes | `String`  | String of scopes. | *Required* |



##### Returns


- Promise that resolves the `platform access token endpoint` for the given scopes if it succeeds and `false` if it fails.




#### async Platform.delete() 

Deletes a registered platform.






##### Returns

- Promise that resolves `true` if it succeeds and `false` if it fails.


---


## License

[![APACHE2 License](https://img.shields.io/github/license/cvmcosta/ltijs)](LICENSE)
