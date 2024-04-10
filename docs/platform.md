

<div align="center">
	<br>
	<br>
	<a href="https://cvmcosta.github.io/ltijs"><img width="360" src="logo-300.svg"></img></a>
  <a href="https://site.imsglobal.org/certifications/coursekey/ltijs"​ target='_blank'><img width="80" src="https://www.imsglobal.org/sites/default/files/IMSconformancelogoREG.png" alt="IMS Global Certified" border="0"></img></a>
</div>


> Platform class


[![codecov](https://codecov.io/gh/Cvmcosta/ltijs/branch/master/graph/badge.svg)](https://codecov.io/gh/Cvmcosta/ltijs)
[![Node Version](https://img.shields.io/node/v/ltijs.svg)](https://www.npmjs.com/package/ltijs)
[![NPM package](https://img.shields.io/npm/v/ltijs.svg)](https://www.npmjs.com/package/ltijs)
[![NPM downloads](https://img.shields.io/npm/dm/ltijs)](https://www.npmjs.com/package/ltijs)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![APACHE2 License](https://img.shields.io/github/license/cvmcosta/ltijs)](#LICENSE)
[![Donate](https://img.shields.io/badge/Donate-Buy%20me%20a%20coffe-blue)](https://www.buymeacoffee.com/UL5fBsi)

## Table of Contents

- [Introduction](#introduction)
- [Documentation](#documentation)
- [License](#license)

---


## Introduction

The ```Platform``` class represents a [LTI® Consumer](https://www.imsglobal.org/spec/lti/v1p3/#platforms-and-tools).


---


## Documentation



#### async Platform.platformUrl() 

Gets the platform url.


##### Returns

- Promise that resolves the `platform url`.


#### async Platform.platformClientId() 

Gets the platform client id.


##### Returns

- Promise that resolves `tool client id`.


#### async Platform.platformId() 

Gets the platform Id.


##### Returns

- `String` representing the platform Id.


#### async Platform.platformKid() 

Gets the platform key id.


##### Returns

- `String` representing the platform key id.



#### async  Platform.platformPublicKey() 

Gets the RSA public key assigned to the platform.

##### Returns

- Promise that resolves the `platform public key`.




#### async Platform.platformPrivateKey() 

Gets the RSA private key assigned to the platform.


##### Returns

- Promise that resolves the `platform private key`.



#### async Platform.platformName([name]) 

Sets/Gets the platform name.




##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| name | `String`  | Platform name. | *Optional* |

##### Returns


- Promise that resolves the `platform name`.



#### async Platform.platformAuthConfig(method, key) 

Sets/Gets the platform authorization configurations used to validate it's messages.



##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| method | `String`  | Method of authorization "RSA_KEY" or "JWK_KEY" or "JWK_SET". | &nbsp; |
| key | `String`  | Either the RSA public key provided by the platform, or the JWK key, or the JWK keyset address. | &nbsp; |



##### Returns



- Promise that resolves the `platform authentication configuration`.




#### async Platform.platformAuthenticationEndpoint([authenticationEndpoint]) 

Sets/Gets the platform authentication endpoint used to perform the OIDC login.


##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| authEndpoint | `String`  | Platform authorization endpoint. | *Optional* |




##### Returns


- Promise that resolves the `platform authentication endpoint`.




#### async Platform.platformAccessTokenEndpoint([accesstokenEndpoint]) 

Sets/Gets the platform access token endpoint used to authenticate messages to the platform.



##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| accesstokenEndpoint | `String`  | Platform access token endpoint. | *Optional* |



##### Returns



- Promise that resolves the `platform access token endpoint`.

#### async Platform.platformActive([status]) 

Sets/Gets the platform activation status.


##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| status | `Boolean`  | Platform activation status. | *Optional* |

##### Returns


- Promise that resolves the `platform activation status`.



#### async Platform.platformAccessToken(scopes) 

Gets the platform access token or attempts to generate a new one.



##### Parameters

| Name | Type | Description |  |
| ---- | ---- | ----------- | -------- |
| scopes | `String`  | String of scopes. | *Required* |



##### Returns


- Promise that resolves the `platform access token endpoint` for the given scopes.


#### async Platform.platformJSON() 

Retrieves the platform information as a JSON object.


##### Returns


- JSON object containing the platform information.



#### async Platform.delete() 

Deletes the platform and the related keys.




##### Returns

- Promise that resolves `true`.


---


## License

[![APACHE2 License](https://img.shields.io/github/license/cvmcosta/ltijs)](LICENSE)
