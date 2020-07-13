

<div align="center">
	<br>
	<br>
	<a href="https://cvmcosta.github.io/ltijs"><img width="360" src="logo-300.svg"></img></a>
  <a href​="https://site.imsglobal.org/certifications/coursekey/ltijs"​><img
    width="80"
    src="https://www.imsglobal.org/sites/default/files/IMSconformancelogoREG.png"
    alt="IMS Global Certified" border="0">
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


Ltijs implements the [LTI 1.3 Assignment and Grading Service Specification](https://www.imsglobal.org/spec/lti-ags/v2p0/) in the form of the **Grade Class**.

___


## Basic Usage


##### Sending grades to a platform

Ltijs is able to send grades to a platform in the [application/vnd.ims.lis.v1.score+json](https://www.imsglobal.org/spec/lti-ags/v2p0/#score-publish-service) LTI standard:

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
let grade = {
  scoreGiven: 50,
  activityProgress: 'Completed',
  gradingProgress: 'FullyGraded'
}

// Sends a grade to a platform's grade line
lti.Grade.scorePublish(res.locals.token, grade)
```



##### Retrieving grades from a platform

Ltijs is able to retrieve grades from a platform:

```javascript
// Retrieves grade from a platform's grade line only for the current user
let result  = await lti.Grade.result(res.locals.token, { userId: true })
```



---

## License

[![APACHE2 License](https://img.shields.io/github/license/cvmcosta/ltijs)](LICENSE)
