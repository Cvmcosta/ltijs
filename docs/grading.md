

<div align="center">
	<br>
	<br>
	<a href="https://cvmcosta.github.io/ltijs"><img width="360" src="logo-300.svg"></img></a>
  <a href="https://site.imsglobal.org/certifications/coursekey/ltijs"​ target='_blank'><img width="80" src="https://www.imsglobal.org/sites/default/files/IMSconformancelogoREG.png" alt="IMS Global Certified" border="0"></img></a>
</div>


> Grading Service class


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
- [License](#license)

---


## Introduction


Ltijs implements the [LTI® 1.3 Assignment and Grading Service Specification](https://www.imsglobal.org/spec/lti-ags/v2p0/) in the form of the **Grade Class**.

#### **This documentation is incomplete. The full Assignment and Grades documentation is being written and will come out soon...**
- For now, please see this gist for an example of the new Grading system: [Grading gist](https://gist.github.com/Cvmcosta/2a503dd3df6905cd635d26d188f99c13)

___


## Basic Usage


##### Sending grades to a platform

Ltijs is able to send grades to a platform in the [application/vnd.ims.lis.v1.score+json](https://www.imsglobal.org/spec/lti-ags/v2p0/#score-publish-service) LTI® standard:

```javascript
{
  "scoreGiven" : 83,
  "comment" : "This is exceptional work.",
  "activityProgress" : "Completed",
  "gradingProgress": "FullyGraded"
}
```

> This excludes the fields *timestamp*, *userId* and *scoreMaximum* of the specification, because the *messagePlatform()* function fills them automatically using the idtoken passed


Sending the grade: 

```javascript
lti.app.post('/grade', async (req, res) => {
  let grade = {
    scoreGiven: 50,
    activityProgress: 'Completed',
    gradingProgress: 'FullyGraded'
  }

  // Sends a grade to a platform's grade line
  await lti.Grade.scorePublish(res.locals.token, grade)
  return res.sendStatus(201)
})
```



##### Retrieving grades from a platform

Ltijs is able to retrieve grades from a platform:

```javascript
lti.app.get('/grade', async (req, res) => {
  // Retrieves grades from a platform, only for the current user
  const result  = await lti.Grade.result(res.locals.token, { userId: true })
  return res.send(result)
})
```

##### Line item Creation, Retrieval and Deletion documentation


```javascript
// Retrieving lineitems
lti.app.get('/lineitem', async (req, res) => {
  // Retrieves lineitems from a platform
  const result  = await lti.Grade.getLineItems(res.locals.token)
  return res.send(result)
})

// Creating lineitem
lti.app.post('/lineitem', async (req, res) => {
  const lineItem = {
          scoreMaximum: 100,
          label: 'Grade',
          tag: 'grade'
        }
  // Sends lineitem to a platform
  await lti.Grade.createLineItem(res.locals.token, lineItem)
  return res.sendSatus(201)
})

// Deleting lineitem
lti.app.delete('/lineitem', async (req, res) => {
  // Deleting lineitem on a platform
  await lti.Grade.deleteLineItems(res.localstoken, { tag: 'tag' })
  return res.sendSatus(204)
})

```

---

## License

[![APACHE2 License](https://img.shields.io/github/license/cvmcosta/ltijs)](LICENSE)
