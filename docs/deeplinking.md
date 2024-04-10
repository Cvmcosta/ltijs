

<div align="center">
	<br>
	<br>
	<a href="https://cvmcosta.github.io/ltijs"><img width="360" src="logo-300.svg"></img></a>
  <a href="https://site.imsglobal.org/certifications/coursekey/ltijs"​ target='_blank'><img width="80" src="https://www.imsglobal.org/sites/default/files/IMSconformancelogoREG.png" alt="IMS Global Certified" border="0"></img></a>
</div>


> Deep Linking Service class


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
- [Documentation](#documentation)
- [License](#license)

---


## Introduction
Ltijs implements the [LTI® 1.3 Deep Linking Service Specification](https://www.imsglobal.org/spec/lti-dl/v2p0/) in the form of the **DeepLinking Class**.

Deep Linking consists of using a LTI® launch to select specific resources within a tool to be displayed to the user.

This class provides two methods for generating the deep linking messages, and a callback method called whenever there is a successfull deep linking launch.

Following the official specification, the usual working flow is: 

- Platform initiates deep linking launch.
- onDeepLinking() callback is called and redirects to the resource selection view.
- In the resource selection view, the user selects one or more resources and makes a POST request with the result.
- The tool then uses the provider.DeepLinking class to generate the self submitting form with the signed JWT message of the deep linking request and returns the form to the client.
- The client then embeds the form in the page, submitting the deep linking request.

---


## Usage


#### Deep linking callback

Whenever a platform makes a successfull deep linking launch to the tool, the deep linking callback is called, so that the tool can display a resource selection view:

```javascript
// Deep Linking callback
lti.onDeepLinking((token, req, res) => {
  // Call redirect function to deep linking view
  lti.redirect(res, '/deeplink')
})

// Deep Linking route, displays the resource selection view
lti.app.get('/deeplink', async (req, res) => {
  return res.sendFile(path.join(__dirname, '/public/resources.html'))
})
```

**Deep linking launches uses the same endpoint as regular launches.**


#### Deep linking message

After resources are selected, the tool can now create a deep linking request message and send to the platform, this can be done through two methods:

- createDeepLinkingForm(idtoken, contentitems, options)

Returns a self submitting Deep Linking form containing the signed JWT message, this form should be embeded in the html of the tool's client in order to finish the deep linking request.

```javascript
// Handles deep linking request generation with the selected resource
  lti.app.post('/deeplink', async (req, res) => {
    const resource = req.body

    const items = [
      {
        type: 'ltiResourceLink',
        title: resource.title,
        url: resource.url,
        custom: {
          resourceurl: resource.path,
          resourcename: resource.title
        }
      }
    ]

    // Creates the deep linking request form
    const form = await lti.DeepLinking.createDeepLinkingForm(res.locals.token, items, { message: 'Successfully registered resource!' })

    return res.send(form)
  })
```

- createDeepLinkingMessage(idtoken, contentitems, options)

Returns a signed JWT message, that the client has to submit in a POST form in order to finish the deep linking request.

```javascript
// Handles deep linking request generation with the selected resource
  lti.app.post('/deeplink', async (req, res) => {
    const resource = req.body

    const items = [
      {
        type: 'ltiResourceLink',
        title: resource.title,
        url: resource.url,
        custom: {
          resourceurl: resource.path,
          resourcename: resource.title
        }
      }
    ]

    // Creates the deep linking request JWT message
    const message = await lti.DeepLinking.createDeepLinkingMessage(res.locals.token, items, { message: 'Successfully registered resource!' })

    return res.send(message)
  })
```

#### idtoken parameter

Since most of the information necessary to create a deep linking request is present in the idtoken, it is necessary to pass it along as the first parameter.

```javascript
/*
...
*/
// Retrieves idtoken from the locals variable
const token = res.locals.token
const message = await lti.DeepLinking.createDeepLinkingMessage(token, items, { message: 'Successfully registered resources!' })
```



#### contentItems parameter

The contentItems parameter is either an content item object or a array of content item objects, following the [LTI® 1.3 content item specification](https://www.imsglobal.org/spec/lti-dl/v2p0/#content-item-types). 

Passing the parameter **does not guarantee that all content items will be sent in the request**, to avoid errors, Ltijs only sends content items that fit within the platform's accepted item types and allowed quantity .

If a platform only allows one content item per deep linking request, only the first content item passed in the parameter will actually be sent to the platform.

Ex:

```javascript
const items = [
      {
        type: 'ltiResourceLink',
        title: 'LTI resource',
        url: 'https://your.ltijs.com?resource=resource1',
        custom: {
          resource: 'resource1'
        }
      },
      {
        type: 'link',
        title: 'Link',
        url: 'https://link.com'
      }
    ]

const message = await lti.DeepLinking.createDeepLinkingMessage(res.locals.token, items, { message: 'Successfully registered resources!' })
```


#### options

The [Deep Linking specification](https://www.imsglobal.org/spec/lti-dl/v2p0) allows us to set custom messages that should be displayed to the user in case of success or failure:

- options.message 

ex: 'Successfully registered the resources!'

- options.errMessage 

ex: 'Resource registration failed!'

We can also set the messages that the platform will log in their systems in case of success or failure.

- options.log

ex: 'registered_lti_resource'

- options.errLog

ex: 'resource_registration_failed'

--- 

### Example: 

```javascript
// Deep Linking callback
lti.onDeepLinking((token, req, res) => {
  // Displays the resource selection view
  return res.sendFile(path.join(__dirname, '/public/resources.html'))
})

// Handles deep linking request generation with the selected resource
lti.app.post('/deeplink', async (req, res) => {
  const resource = req.body

  const items = [
    {
      type: 'ltiResourceLink',
      title: resource.title,
      custom: {
        resourceurl: resource.path,
        resourcename: resource.title
      }
    }
  ]

  // Creates the deep linking request form
  const form = await lti.DeepLinking.createDeepLinkingForm(res.locals.token, items, { message: 'Successfully registered resource!' })

  return res.send(form)
})
```


___


## Documentation





#### async DeepLinking.createDeepLinkingForm(idtoken, contentItems, options) 

Creates a self submitting form containing the signed JWT message of the deep linking request.



##### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| idtoken | `Object`  | Id token. |
| contentItems | `Object` | Array<Object>`  | One or more contentItem Objects. |
| options | `Object`  | Options object. |
| options.message | `String`  | Message the platform may show to the end user upon return to the platform. |
| options.errMessage | `String`  | Message the platform may show to the end user upon return to the platform if some error has occurred. |
| options.log | `String`  | Message the platform may log in it's system upon return to the platform. |
| options.errLog | `String`  | Message the platform may log in it's system upon return to the platform if some error has occurred. |




##### Returns


- Self submitting Deep Linking form containing the signed JWT message.



#### async DeepLinking.createDeepLinkingMessage(idtoken, contentItems, options)

Creates a signed JWT message of the deep linking request.




##### Parameters


| Name | Type | Description |
| ---- | ---- | ----------- |
| idtoken | `Object`  | Id token. |
| contentItems | `Object` | Array<Object>`  | One or more contentItem Objects. |
| options | `Object`  | Options object. |
| options.message | `String`  | Message the platform may show to the end user upon return to the platform. |
| options.errMessage | `String`  | Message the platform may show to the end user upon return to the platform if some error has occurred. |
| options.log | `String`  | Message the platform may log in it's system upon return to the platform. |
| options.errLog | `String`  | Message the platform may log in it's system upon return to the platform if some error has occurred. |



##### Returns


 - Signed JWT message of the deep linking request.




---

## License

[![APACHE2 License](https://img.shields.io/github/license/cvmcosta/ltijs)](LICENSE)
