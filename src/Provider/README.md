# [ltijs](https://cvmcosta.github.io/ltijs) - Provider

> Turn your application into a lti tool.


[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![MIT License](https://img.shields.io/github/license/Cvmcosta/ltijs.svg)](LICENSE)


## Table of Contents

- [Introduction](#introduction)
- [Example](#example)
- [Documentation](#documentation)
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
You can find the project documentation [here](https://cvmcosta.github.io/ltijs/#/provider).

---


## License

[![MIT License](https://img.shields.io/github/license/Cvmcosta/ltijs.svg)](LICENSE)

- **[MIT license](http://opensource.org/licenses/mit-license.php)**