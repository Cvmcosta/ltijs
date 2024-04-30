

<div align="center">
	<br>
	<br>
	<a href="https://cvmcosta.github.io/ltijs"><img width="360" src="logo-300.svg"></img></a>
  <a href="https://site.imsglobal.org/certifications/coursekey/ltijs"​ target='_blank'><img width="80" src="https://www.imsglobal.org/sites/default/files/IMSconformancelogoREG.png" alt="IMS Global Certified" border="0"></img></a>
</div>


> Grading Service class


[![codecov](https://codecov.io/gh/Cvmcosta/ltijs/branch/master/graph/badge.svg)](https://codecov.io/gh/Cvmcosta/ltijs)
[![Node Version](https://img.shields.io/node/v/ltijs.svg)](https://www.npmjs.com/package/ltijs)
[![NPM package](https://img.shields.io/npm/v/ltijs.svg)](https://www.npmjs.com/package/ltijs)
[![NPM downloads](https://img.shields.io/npm/dm/ltijs)](https://www.npmjs.com/package/ltijs)
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

___


## Basic Usage


##### Sending grades to a platform

Ltijs is able to send grades to a platform in the [application/vnd.ims.lis.v1.score+json](https://www.imsglobal.org/spec/lti-ags/v2p0/#score-publish-service) LTI® standard:

```javascript
{ 
  "userId" : "200",
  "scoreGiven" : 83,
  "scoreMaximum" : 100,
  "comment" : "This is exceptional work.",
  "activityProgress" : "Completed",
  "gradingProgress": "FullyGraded"
}
```

> This excludes the *timestamp* field of the specification, because the submitScore method generates it automatically.


Sending the grade: 

```javascript
const lti = require('ltijs').Provider

/**
 * sendGrade
 */
lti.app.post('/grade', async (req, res) => {
  try {
    const idtoken = res.locals.token // IdToken
    const score = req.body.grade // User numeric score sent in the body
    // Creating Grade object
    const gradeObj = {
      userId: idtoken.user,
      scoreGiven: score,
      scoreMaximum: 100,
      activityProgress: 'Completed',
      gradingProgress: 'FullyGraded'
    }

    // Selecting linetItem ID
    let lineItemId = idtoken.platformContext.endpoint.lineitem // Attempting to retrieve it from idtoken
    if (!lineItemId) {
      const response = await lti.Grade.getLineItems(idtoken, { resourceLinkId: true })
      const lineItems = response.lineItems
      if (lineItems.length === 0) {
        // Creating line item if there is none
        console.log('Creating new line item')
        const newLineItem = {
          scoreMaximum: 100,
          label: 'Grade',
          tag: 'grade',
          resourceLinkId: idtoken.platformContext.resource.id
        }
        const lineItem = await lti.Grade.createLineItem(idtoken, newLineItem)
        lineItemId = lineItem.id
      } else lineItemId = lineItems[0].id
    }

    // Sending Grade
    const responseGrade = await lti.Grade.submitScore(idtoken, lineItemId, gradeObj)
    return res.send(responseGrade)
  } catch (err) {
    return res.status(500).send({ err: err.message })
  }
})
```



##### Retrieving grades from a platform

Ltijs is able to retrieve grades from a platform:

```javascript
lti.app.get('/grade', async (req, res) => {
  // Retrieves grades from a platform, only for the current user
  const idtoken = res.locals.token // IdToken
  const response = await lti.Grade.getScores(idtoken, idtoken.platformContext.endpoint.lineitem, { userId: idtoken.user })
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
  await lti.Grade.deleteLineItems(res.locals.token, { tag: 'tag' })
  return res.sendSatus(204)
})

```

---

## License

[![APACHE2 License](https://img.shields.io/github/license/cvmcosta/ltijs)](LICENSE)
