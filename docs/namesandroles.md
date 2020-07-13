

<div align="center">
	<br>
	<br>
	<a href="https://cvmcosta.github.io/ltijs"><img width="360" src="logo-300.svg"></img></a>
  <a href="https://site.imsglobal.org/certifications/coursekey/ltijs"​><img width="80" src="https://www.imsglobal.org/sites/default/files/IMSconformancelogoREG.png" alt="IMS Global Certified" border="0"></img></a>
</div>


> Names and Roles Provisioning Service class


[![travisci](https://travis-ci.org/Cvmcosta/ltijs.svg?branch=master)](https://travis-ci.org/Cvmcosta/ltijs)
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
Ltijs implements the [LTI 1.3 Names and Roles Provisioning Service](https://www.imsglobal.org/spec/lti-nrps/v2p0) in the form of the **NamesAndRoles Class**.

The Names And Roles Provisioning Service can be used by a tool to access a list of platform's users (referred to as members) and their roles within the context of a course, program or other grouping.

This class provides a single method for retrieving membership information, and offers the specified filters and functionalities.

---


## Usage


#### Retrieving members from a platform

All members of a platform within the context can be retrieved simply by calling the `getMembers()` method:

***Since the information necessary to make request is present in the idtoken, it is necessary to pass it along as the first parameter.***


``` javascript
const response = await lti.NamesAndRoles.getMembers(res.locals.token) // Gets context members
```


Ex standard response:

```javascript
{
"id" : "https://lms.example.com/sections/2923/memberships",
"context": {
  "id": "2923-abc",
  "label": "CPS 435",
  "title": "CPS 435 Learning Analytics",
},
"members" : [
  {
    "status" : "Active",
    "name": "Jane Q. Public",
    "picture" : "https://platform.example.edu/jane.jpg",
    "given_name" : "Jane",
    "family_name" : "Doe",
    "middle_name" : "Marie",
    "email": "jane@platform.example.edu",
    "user_id" : "0ae836b9-7fc9-4060-006f-27b2066ac545",
    "lis_person_sourcedid": "59254-6782-12ab",
    "roles": [
      "http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor"
    ]
  }
]
}
```


#### Adding filters

The `getMembers()` method allows us to apply filters to the request, and these filters can be specified through the `options` parameter:

- **options.role**

  Specifies that only members part of a certain role should be included in the list.

  Ex: 
  ``` javascript
  const members = await lti.NamesAndRoles.getMembers(res.locals.token, { role: 'Learner' })
  ```


- **options.limit**

  Specifies the number of members per page that should be returned. **(This does not add a page limit, usually the `limit` and `pages` filters would be used together)**

- **options.pages**
  Specifies the number of pages that should be returned. **(Using this without the `limit` filter just causes the entire member list to be returned in a single page)**

  Ex: 

  *The code bellow will return up to 20 members*

  ```javascript
  const result = await lti.NamesAndRoles.getMembers(res.locals.token, { role: 'Learner', limit: 10, pages: 2 })
  ```

- **options.url** 

  In case not all members were retrieved when the page limit was reached, the returned object will contain a `next` field holding an url that can be used to retrieve the remaining members. This url can be passed through the `options.url` parameter. (**At the moment, if the `options.url` parameter is present, the `limit` and `role` filters are ignored, instead, the filters applied on the initial request will be maintained**)

  Ex:

  ```javascript
    {
    "id" : "https://lms.example.com/sections/2923/memberships",
    "context": {
      "id": "2923-abc",
      "label": "CPS 435",
      "title": "CPS 435 Learning Analytics",
    },
    "members" : [
      ...
    ],
    "next": "https://lms.example.com/sections/2923/memberships/page/2"
    }
  ```

  ```javascript
  const result = await lti.NamesAndRoles.getMembers(res.locals.token, { role: 'Learner', limit: 10, pages: 2 })
  const next = result.next
  const remaining = await lti.NamesAndRoles.getMembers(res.locals.token, { pages: 2, url: next }) // This request will maintain the "limit" and "role" parameters of the initial request
  ```



--- 

### Example basic usage: 

```javascript
const path = require('path')

// Require Provider 
const LTI = require('ltijs').Provider

// Configure provider
const lti = new LTI('EXAMPLEKEY', 
            { url: 'mongodb://localhost/database' }, 
            { appRoute: '/', loginRoute: '/login', logger: true })


let setup = async () => {
  // Deploy and open connection to the database
  await lti.deploy({ port: 3000 })

  // Register platform
  let plat = await lti.registerPlatform({ 
    url: 'https://platform.url',
    name: 'Platform Name',
    clientId: 'TOOLCLIENTID',
    authenticationEndpoint: 'https://platform.url/auth',
    accesstokenEndpoint: 'https://platform.url/token',
    authConfig: { method: 'JWK_SET', key: 'https://platform.url/keyset' }
  })

  // Regular connection callback
  lti.onConnect((connection, request, response) => {
    // Call redirect function
    lti.redirect(response, '/main')
  })

  // Main route 
  lti.app.get('/main', (req, res) => {
    // Id token
    console.log(res.locals.token)
    res.send('It\'s alive!')
  })

  // Members route
   lti.app.get('/members', async (req, res) => {
    const members = await lti.NamesAndRoles.getMembers(res.locals.token) // Gets context members
    res.send(members)
  })
}
setup()
```


___


## Documentation





#### async DeepLinking.getMembers(idtoken, options) 

Retrieves members from platform.



##### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| idtoken | `Object`  | Id token. |
| options | `Object`  | Options object. |
| options.role| `String`  | Specific role to be returned. |
| options.limit | `Number`  | Specifies maximum number of members per page. |
| options.pages | `Number`  | Specifies maximum number of pages returned. |
| options.url | `String` | Specifies the initial members endpoint, usually retrieved from a previous incomplete request. |




##### Returns


- Object containing an array of members.

Ex: 

```javascript
{
"id" : "https://lms.example.com/sections/2923/memberships",
"context": {
  "id": "2923-abc",
  "label": "CPS 435",
  "title": "CPS 435 Learning Analytics",
},
"members" : [
  {
    "status" : "Active",
    "name": "Jane Q. Public",
    "picture" : "https://platform.example.edu/jane.jpg",
    "given_name" : "Jane",
    "family_name" : "Doe",
    "middle_name" : "Marie",
    "email": "jane@platform.example.edu",
    "user_id" : "0ae836b9-7fc9-4060-006f-27b2066ac545",
    "lis_person_sourcedid": "59254-6782-12ab",
    "roles": [
      "http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor"
    ]
  }
]
}
```



---

## License

[![APACHE2 License](https://img.shields.io/github/license/cvmcosta/ltijs)](LICENSE)
