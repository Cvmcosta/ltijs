<div align="center">
	<br>
	<br>
	<a href="https://cvmcosta.github.io/ltijs"><img width="360" src="logo-300.svg"></img></a>
  <a href="https://site.imsglobal.org/certifications/coursekey/ltijs"​><img width="80" src="https://www.imsglobal.org/sites/default/files/IMSconformancelogoREG.png" alt="IMS Global Certified" border="0"></img></a>
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
[![APACHE2 License](https://img.shields.io/github/license/cvmcosta/ltijs)](#license)
[![Donate](https://img.shields.io/badge/Donate-Buy%20me%20a%20coffe-blue)](https://www.buymeacoffee.com/UL5fBsi)


Please ⭐️ us on [GitHub](https://github.com/Cvmcosta/ltijs), it always helps!

> [Ltijs is LTI Advantage Complete Certified by IMS](https://site.imsglobal.org/certifications/coursekey/ltijs)

> Ltijs version 5.0 is a re-release of the project as a Certified LTI library, that comes with many improvements and new functionalities and a few API changes, see bellow for a migration guide from version 4.0 and a complete list of the changes made:
> - [Migrating from version 4](https://cvmcosta.github.io/ltijs/#/migration)
> - [5.0 Changelog](https://cvmcosta.github.io/ltijs/#/certchanges)

> - View entire [CHANGELOG](https://cvmcosta.github.io/ltijs/#/changelog)


## Table of Contents

- [Introduction](#introduction)
- [Feature roadmap](#feature-roadmap)
- [Installation](#installation)
- [Tutorial](#tutorial)
- [Usage](#usage)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Special thanks](#special-thanks)
- [License](#license)


---
## Introduction
According to the [IMS Global Learning Consortium](https://www.imsglobal.org/), the Learning Tools Interoperability (LTI) protocol is an IMS standard for integration of rich learning applications within educational environments. <sup>[ref](https://www.imsglobal.org/spec/lti/v1p3/)</sup>


This framework implements a tool provider as an [Express](https://expressjs.com/) server, with preconfigured routes and methods that manage the [LTI 1.3](https://www.imsglobal.org/spec/lti/v1p3/) protocol for you. Making it fast and simple to create a working learning tool with access to every LTI service, without having to worry about manually implementing any of the security and validation required to do so. 


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
[Installing mongoDB](https://docs.mongodb.com/manual/administration/install-community/)


### Database Plugins

Ltijs can also be used with other databases through database plugins that use the same structure as the main database class.

  -  [PostgreSQL Plugin](https://www.npmjs.com/package/ltijs-postgresql)

***Apart from the main methods, not every database plugin has the same functionalities***

---


## Tutorial

You can find a quick tutorial on how to set Ltijs up and use it to send grades to a Moodle platform [here](https://medium.com/@cvmcosta2/creating-a-lti-provider-with-ltijs-8b569d94825c).

## Quick start


> Install Ltijs

```shell
$ npm install ltijs
```

> Install mongoDB

 - [Installing mongoDB](https://docs.mongodb.com/manual/administration/install-community/)


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

See bellow for the complete documentation:

### [Ltijs Documentation](https://cvmcosta.github.io/ltijs/#/provider)

Service documentations:
   - [Deep Linking Service documentation](https://cvmcosta.github.io/ltijs/#/deeplinking)
   - [Grading Service documentation](https://cvmcosta.github.io/ltijs/#/grading)
   - [Names and Roles Provisioning Service documentation](https://cvmcosta.github.io/ltijs/#/namesandroles)

Additional documentation:

   - [Platform class documentation](https://cvmcosta.github.io/ltijs/#/platform) 


---

## Contributing

Please ⭐️ us on [GitHub](https://github.com/Cvmcosta/ltijs), it always helps!

If you find a bug or think that something is hard to understand feel free to open an issue or contact me on twitter [@cvmcosta](https://twitter.com/cvmcosta), pull requests are also welcome :)


And if you feel like it, you can donate any amount through paypal, it helps a lot.

[![Donate](https://img.shields.io/badge/Donate-Buy%20me%20a%20coffe-blue)](https://www.buymeacoffee.com/UL5fBsi)

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
	<a href="https://cvmcosta.github.io/ltijs"><img width="150" src="ufma-logo.png"></img></a>
</div>

> I would like to thank the Federal University of Maranhão for the support throughout the entire development process.




<div align="center">
<br>
	<a href="https://cvmcosta.github.io/ltijs"><img width="180" src="coursekey-logo.png"></img></a>
</div>

> I would like to thank CourseKey for making the Certification process possible and allowing me to be an IMS Member through them, which will contribute immensely to the future of the project.







---

## License

[![APACHE2 License](https://img.shields.io/github/license/cvmcosta/ltijs)](LICENSE)
