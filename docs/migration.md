

<div align="center">
	<br>
	<br>
	<a href="https://cvmcosta.github.io/ltijs"><img width="360" src="logo-300.svg"></img></a>
  <a href="https://site.imsglobal.org/certifications/coursekey/ltijs"​ target='_blank'><img width="80" src="https://www.imsglobal.org/sites/default/files/IMSconformancelogoREG.png" alt="IMS Global Certified" border="0"></img></a>
</div>


> Migration guide v4.1 => v5.0


[![codecov](https://codecov.io/gh/Cvmcosta/ltijs/branch/master/graph/badge.svg)](https://codecov.io/gh/Cvmcosta/ltijs)
[![Node Version](https://img.shields.io/node/v/ltijs.svg)](https://www.npmjs.com/package/ltijs)
[![NPM package](https://img.shields.io/npm/v/ltijs.svg)](https://www.npmjs.com/package/ltijs)
[![NPM downloads](https://img.shields.io/npm/dm/ltijs)](https://www.npmjs.com/package/ltijs)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![APACHE2 License](https://img.shields.io/github/license/cvmcosta/ltijs)](#LICENSE)
[![Donate](https://img.shields.io/badge/Donate-Buy%20me%20a%20coffe-blue)](https://www.buymeacoffee.com/UL5fBsi)

## Table of Contents

- [Introduction](#introduction)
- [Changes](#Changes)
  - [Removed Ltijs constructor](#removed-ltijs-constructor)
  - [Platform registration and retrieval changes](#platform-registration-and-retrieval-changes)
  - [Removed onConnect optional parameters](#removed-onconnect-optional-parameters)
  - [Changed how reserved endpoints are mentioned](#changed-how-reserved-endpoints-are-mentioned)
  - [Added development mode](#added-development-mode)
  - [Renamed Platform remove method to delete](#renamed-platform-remove-method-to-delete)
  - [Renamed redirect new resource option](#renamed-redirect-new-resource-option)
  - [No longer sets automatic cookie domain for external redirection](#no-longer-sets-automatic-cookie-domain-for-external-redirection)
  - [Changed error handling policy](#changed-error-handling-policy)
  - [Bumped required version of Node](#bumped-required-version-of-node)
- [License](#license)

---


## Introduction


Ltijs version 5.0 is a re-release of the project as a Certified LTI® library, that comes with many improvements, new functionalities and a few **API changes**, see bellow for a migration guide from version 4.

___


## Changes

#### Removed Ltijs constructor

> **This:**

``` javascript
// Require Provider 
const Lti = require('ltijs').Provider

// Setup provider using contructor
const lti = new Lti('LTIKEY', // Key used to sign cookies and tokens
         { url: 'mongodb://localhost/database' }, // Database configuration
         { appUrl: '/', loginUrl: '/login' }) // Optionally, specify some of the reserved routes
```

> **Becomes this:**

``` javascript
// Require Provider 
const lti = require('ltijs').Provider

// Setup provider using setup method
lti.setup('LTIKEY', // Key used to sign cookies and tokens
         { url: 'mongodb://localhost/database' }, // Database configuration
         { appRoute: '/', loginRoute: '/login' }) // Optionally, specify some of the reserved routes
```

The constructor was replaced with a [setup()](https://cvmcosta.me/ltijs/#/provider?id=setting-up-ltijs) method that **works in the exact same way**. This was done because Ltijs now works as a singleton, which allows it's functionalities to be accessed across multiple files:

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

#### Platform registration and retrieval changes

> **This:**
``` javascript
const plat = await lti.getPlatform('http://plat.com')
```

> **Becomes this:**
``` javascript
const plat = await lti.getPlatform('http://plat.com', 'CLIENTID')
```

[Platform registration](https://cvmcosta.me/ltijs/#/provider?id=registering-a-new-platform) now accepts multiple platforms with the same platform Url as long as they have different Client Ids. This was implemented to deal with Canvas's LTI® implementation where every instructure hosted Canvas instance sends the same issuer (platform Url) in the login request, so Ltijs needs to be able to register multiple platforms with the same Url.

To accomodate this change, the registration parameter can now receive an additional parameter `clientId`. **Whenever the method receives only the platformUrl, it will return an Array of Platform objects. Passing the two arguments returns only the desired Platform object.**

Passing only the platformUrl:
``` javascript
/*
Returns [Platform, Platform]
*/
const plat = await lti.getPlatform('http://plat.com')
```

Passing platformUrl and ClientId:
``` javascript
/*
Returns Platform
*/
const plat = await lti.getPlatform('http://plat.com', 'CLIENTID2')
```

A new `clientId` field was also added to the [IdToken object](https://cvmcosta.me/ltijs/#/provider?id=idtoken) to help with programmatically retrieving platforms relevant to a specific LTI® launch.

```javascript
lti.onConnect((token, request, response,  next) => {
    const plat = await lti.getPlatform(token.iss, token.clientId)
  }
)
```

To prevent accidental deletions, the [lti.deletePlatform()](https://cvmcosta.me/ltijs/#/provider?id=deleting-a-platform) method **requires both parameters to be passed:**

> **This:**
``` javascript
await lti.deletePlatform('http://plat.com')
```

> **Becomes this:**
``` javascript
await lti.deletePlatform('http://plat.com', 'CLIENTID')
```

#### Removed onConnect optional parameters

> **This:**

``` javascript
lti.onConnect(
  (conection, request, response,  next) => {
    response.send('User connected!')
  }, {
    sessionTimeout: (req, res) => { res.send('Session timed out') }, 
    invalidToken: (req, res) => { res.send('Invalid token') } 
  }
)
```

> **Becomes this:**

``` javascript
lti.onConnect((conection, request, response,  next) => {
    response.send('User connected!')
  }
)
lti.onInvalidToken((req, res) => { 
  res.send('Invalid token') 
  }
)
lti.onSessionTimeout((req, res) => { 
  res.send('Session timed out') 
  }
)
```

The onConnect optional parameters that allowed you to specify how to handle Invalid tokens or Session timeouts were removed and turned into their own [standalone methods](https://cvmcosta.me/ltijs/#/provider?id=callbacks).

#### Changed how reserved endpoints are mentioned

> **This:**

``` javascript
// Setup provider using contructor
const lti = new Lti('LTIKEY', // Key used to sign cookies and tokens
         { url: 'mongodb://localhost/database' }, // Database configuration
         { appUrl: '/', loginUrl: '/login' }) // Optionally, specify some of the reserved routes

console.log(lti.appUrl())
```

> **Becomes this:**

``` javascript
// Setup provider using setup method
lti.setup('LTIKEY', // Key used to sign cookies and tokens
         { url: 'mongodb://localhost/database' }, // Database configuration
         { appRoute: '/', loginRoute: '/login' }) // Optionally, specify some of the reserved routes

console.log(lti.appRoute())
```

The reserved endpoint used to be called **Urls** (appUrl, loginUrl, ...) and now are called **Routes** (appRoute, loginRoute, ...), both in the setup parameters where they are set and in the methods used to retrieve them (lti.appRoute(), lti.loginRoute()). 

 - **appUrl: '/app'** => **appRoute: '/app'**
 - **lti.appUrl()** => **lti.appRoute()**

The term **Url** could cause some confusion and users could end up setting `appUrl` as `appUrl: 'http://localhost:3000/app'` instead of `appUrl: '/app'`, **Route** is a more accurate description. I'm hoping this change can help avoid such issues.


#### Added development mode

Version 5.0 of Ltijs validates login requests using a `state` cookie to prevent cross-site request forgery as recommmended by the IMS specification. This can sometimes cause issues in certain development environments if the browser cannot set the required cookie, for example when trying to set a cross domain cookie without the `secure=true` and `sameSite=none` cookie flags (which don't work without https).

The [devMode flag](https://cvmcosta.me/ltijs/#/provider?id=development-mode) tells Ltijs to bypass cookie validation, which allows the application to run properly even without being able to set cookies. ***This flag should never be used in a production environment, instead developers should set the secure and sameSite cookie flags that will allow browser to set cross domain cookies.***

> In a development environment, without https, not being able to set cross domain cookies:

``` javascript
const lti = new Lti('LTIKEY', // Key used to sign cookies and tokens
         { url: 'mongodb://localhost/database' }, // Database configuration
         { devMode: true }) // Dev mode set to true
```

> In a production environment, with https:

``` javascript
const lti = new Lti('LTIKEY', // Key used to sign cookies and tokens
         { url: 'mongodb://localhost/database' }, // Database configuration
         { cookies: { secure: false, sameSite: 'None' } }) // Correct cookie configuration set
```



#### Renamed Platform remove method to delete

> **This:**

``` javascript
platform.remove()
```

> **Becomes this:**

``` javascript
platform.delete()
```

Changed the platform deletion method from `remove` to `delete` in order to make it more similar to the `lti.deletePlatform()` method.


#### Renamed redirect new resource option

> **This:**

``` javascript
lti.redirect(res, '/route', { isNewResource: true })
```

> **Becomes this:**

``` javascript
lti.redirect(res, '/route', { newResource: true })
```

Option was renamed to `newResource` to make it more consistent with the naming patterns.

#### No longer sets automatic cookie domain for external redirection

In previous versions, Ltijs would detect an external redirection and attempt to set a cookie domain matching the redirection target. But having in mind that **this would yield no results on redirections to different domains**, this behaviour was removed and replaced by the [option to set the domain of every cookie](https://cvmcosta.me/ltijs/#/provider?id=cookie-configuration) set by Ltijs. 

This allows the developer to set a domain that would cause cookies to be shared between all subdomains.

``` javascript
// Require Provider 
const lti = require('ltijs').Provider

// Setup provider using setup method
lti.setup('LTIKEY', // Key used to sign cookies and tokens
         { url: 'mongodb://localhost/database' }, // Database configuration
         { cookies: { domain: '.domain.com' } }) // Setting cookie domain
```


#### Changed error handling policy

In previous versions, Ltijs would catch errors thrown within methods, log them and then return false. In version 5.0, errors are not caught by the methods themselves, this was done to give developers more freedom on how they choose to handle errors. 

**The Logger functionality was also removed, developers can now choose how to log access and error information.**

*(This change does not apply to the LTI® authentication flow, errors thrown during the validation process still redirect to the invalid token or session timeout endpoint.)*

#### Bumped required version of Node

Required version of node was changed from **8.6.0** to **10.19.0** due to a dependency update.

---

## License

[![APACHE2 License](https://img.shields.io/github/license/cvmcosta/ltijs)](LICENSE)
