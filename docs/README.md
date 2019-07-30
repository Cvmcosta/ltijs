# [LTIjs](README.md) 

> Turn your application into a fully integratable LTI 1.3 tool or platform.

[![travisci](https://img.shields.io/travis/cvmcosta/ltijs.svg)](https://travis-ci.org/Cvmcosta/ltijs)
[![codecov](https://codecov.io/gh/Cvmcosta/ltijs/branch/master/graph/badge.svg)](https://codecov.io/gh/Cvmcosta/ltijs)
[![Node Version](https://img.shields.io/node/v/ltijs.svg)](https://www.npmjs.com/package/ltijs)
[![NPM package](https://img.shields.io/npm/v/ltijs.svg)](https://www.npmjs.com/package/ltijs)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![APACHE2 License](https://img.shields.io/github/license/cvmcosta/ltijs)](#LICENSE)




## Table of Contents

- [Introduction](#introduction)
- [Installation](#installation)
- [Features](#features)
- [Usage](#usage)
- [License](#license)


---
## Introduction
According to the [IMS Global Learning Consortium](https://www.imsglobal.org/), the Learning Tools Interoperability (LTI) protocol is an IMS standard for integration of rich learning applications within educational environments. <sup>[ref](https://www.imsglobal.org/spec/lti/v1p3/)</sup>


This package implements a tool provider and consumer (currently in development) as an [Express](https://expressjs.com/) server, with preconfigured routes and methods that manage the [LTI 1.3](https://www.imsglobal.org/spec/lti/v1p3/) protocol for you. Making it fast and simple to create a working learning tool without having to worry about manually implementing any of the security and validation required to do so. 


---


## Installation

### Installing the package

```shell
$ npm install ltijs
```
### MongoDB
- This package uses mongoDB to store and manage the server data, so you need to have it installed, see link bellow for further instructions.
[Installing mongoDB](https://docs.mongodb.com/manual/administration/install-community/)

---

## Features

This package implements LTI Provider and Consumer servers. See bellow for specific documentations.

### [LTIjs Provider Documentation](provider.md) 
   - [Platform class documentation](platform.md)
### ~~LTIjs Consumer Documentation~~ (Coming soon)

---

## Usage

### Example of provider usage

> Update and install this package first

```shell
$ npm install ltijs
```

> Install mongoDB

 - [Installing mongoDB](https://docs.mongodb.com/manual/administration/install-community/)


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

---

## License

[![APACHE2 License](https://img.shields.io/github/license/cvmcosta/ltijs)](LICENSE)
