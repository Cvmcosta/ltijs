# [ltijs](https://cvmcosta.github.io/ltijs) 

> A simple nodejs package to facilitate the implementation of LTI providers and consumers.


[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![MIT License](https://img.shields.io/github/license/Cvmcosta/ltijs.svg)](LICENSE)


## Table of Contents

- [Introduction](#introduction)
- [Installation](#installation)
- [Documentation](#documentation)
- [License](#license)


---
## Introduction
According to the [IMS Global Learning Consortium](https://www.imsglobal.org/), the Learning Tools Interoperability (LTI) protocol is an IMS standard for integration of rich learning applications within educational environments. <sup>[ref](https://www.imsglobal.org/spec/lti/v1p3/)</sup>


This package implements a tool provider and consumer (currently in development) as an [Express](https://expressjs.com/) server, with preconfigured routes and methods that manage the [Lti 1.3](https://www.imsglobal.org/spec/lti/v1p3/) protocol for you. Making it fast and simple to create a working learning tool without having to worry about manually implementing any of the security and validation required to do so. 


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

This package implements Lti Provider and Consumer servers. See bellow for specific documentations.

- [Lti Provider](https://cvmcosta.github.io/ltijs/#/provider)
- ~~Lti Consumer~~ (Coming soon)

---

## Documentation
You can find the project documentation [here](https://cvmcosta.github.io/ltijs).

---

## License

[![MIT License](https://img.shields.io/github/license/Cvmcosta/ltijs.svg)](LICENSE)

- **[MIT license](http://opensource.org/licenses/mit-license.php)**
