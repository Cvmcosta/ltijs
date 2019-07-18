# [ltijs](https://cvmcosta.github.io/ltijs) - Provider

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
- [License](#license)


---
## Introduction
According to the [IMS Global Learning Consortium](https://www.imsglobal.org/), a  LTI tool Provider is the external application or service providing functionality to the consumer platform. <sup>[ref](https://www.imsglobal.org/spec/lti/v1p3/#platforms-and-tools)</sup>


This package implements a tool provider as an [Express](https://expressjs.com/) server, with preconfigured routes and methods that manage the [LTI 1.3](https://www.imsglobal.org/spec/lti/v1p3/) protocol for you. Making it fast and simple to create a working learning tool without having to worry about manually implementing any of the security and validation required to do so. 

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

---

## Documentation
You can find the project documentation [here](https://cvmcosta.github.io/ltijs/#/provider).

---


## License

[![MIT License](https://img.shields.io/github/license/Cvmcosta/ltijs.svg)](LICENSE)

- **[MIT license](http://opensource.org/licenses/mit-license.php)**