
<div align="center">
	<br>
	<br>
	<a href="https://cvmcosta.github.io/ltijs"><img width="360" src="logo-300.svg"></img></a>
</div>


### CHANGELOG

#### V3.1.5
> 2020-03-20
> MINOR CHANGE
> - Added experimental serverless option to deploy methof. Attempting to use Ltijs with AWS.
> - Changed how Ltijs handles a server startup error, now it gracefully shutdowns and cloeses database connections.
> - Cleaned up server startup code.
> - Added log server startup debug message.
> - Added keysetUrl to startup message.
> - Fixed bug where Ltijs would break if it didnot find the tld in an external request. Now it just carries on as a regular request in that case.


#### V3.1.0
> 2020-03-19
> MAJOR CHANGE
> - Added server addon support.
> - Fixed bug where using redirect() without the isNewResource flag caused a mismatch between cookie name and ltik context path.
> - Added sameSite cookie flag configuration option.
> - Added automatic setting of cookie flags in determined situations.

#### V3.0.3
> 2020-03-14
> MINOR CHANGE
> - Switched the order of route validation so that, if failing to validate in a lti context, whitelisted routes can still work withot acess to a idtoken. This allows routes to be accessed both ways, and route handlers can just check wether or not an idtoken is present.

#### V3.0.0
> 2020-03-8
> MAJOR CHANGE
> - Added Deep Linking Service, exposed through [Provider.DeepLinking](https://cvmcosta.github.io/ltijs/#/deeplinking).
> - Added a new callback, onDeepLinking that tells Ltijs what to display when receiving a deep linking request.
> - Ltik token can now be passed through body parameters, Bearer token authorization header and query parameters.
> - Fixed Database type issue, where some json fields were declared with a `type` key, that changed the type of the entire field.
> - Added the `unique` parameter to the platformUrl field, that deals with the bug that occured when using ltijs in cluster mode with pm2, where platforms would registered more than one time.
> - Added error handling to the registration method. Now it deletes the previously generated key pair kid.

#### V2.5.3

> 2020-02-28
> MINOR CHANGE
> - Fixing error on redirect method. Now accets queries correctly.

#### V2.5.2

> 2020-02-27
> MINOR CHANGE
> - Added library tld-extract to parse the domain of external request urls on the redirect method.
> - lti.redirect now accepts urls with ports, users and queries.
> - Added cookie logs.


#### V2.5.0

> 2020-02-20
> MAJOR CHANGE
> - Simplified the login flow, removed mentions to origin and host header that were causing issues in some situations.
> - Cookie names and LTIK fields are now created based on the iss parameter sent with the login request and idtoken, therefore are more precise in identifying the platform that originated the request.
> - Added a new local variable accessed via res.locals.context that contains information specific to that launch, eg: Custom variables.
> - MongoDB now uses useUnifiedTopology: true to deal with the warning about the deprecated discovery and monitoring engine.

#### V2.4.5

> 2020-02-18
> MINOR CHANGE
> - Removed parse-domain as a dependency due to the unwanted inclusion of jest in it's dependencies. Added valid-url, it's much lighter and does the same job.


#### V2.4.4

> 2020-02-18
> MINOR CHANGE
> - Changes to the login handler method allow oidc flow to be initiated through GET request.

#### V2.4.0

> 2020-02-13
> MAJOR CHANGE
> - Security update, `state` parameter is now validated at the end of the OIDC login flow.
> - Security update, `iss` parameter is now validated at the end of the OIDC login flow.

#### V2.3.1

> 2020-01-03
> MAJOR CHANGE
> - Added a public JWK keyset endpoint to facilitate usage with Canvas LMS (default /keys).

#### V2.1.5

> 2019-10-30
> MINOR CHANGE
> - whitelist() method now accepts objects with the format `{ route: '/route', method: 'POST' }`.


#### V2.0.0

> 2019-09-01
>BREAKING CHANGES
> - New authentication system, now uses a query parameter 'ltik', to pass the ltijs key to the application instead of embedding it into the path.
> - As a result, simplified routing, without needing to account for the context path.
> - Silent option added to the deploy method, that supresses the initial console logs.
> - Ltijs now works with Postgresql database via the ltijs-postgresql plugin.
> - Fixed staticPath option where it used to disable the invalidToken route if some index.html was present in the given path.
> - Graceful shutdown added, closing connection to databases.

#### V1.2.0

> 2019-08-19
> - Implemented error and server request logging.
> - Fixed Static path property, that now works as expected and making it possible to serve static files.
> - Changed Provider.whitelist method to receive strings as rest parameter to make it easier.


#### V1.1.0 

> 2019-08-13
> - Changed Request builder to include some optional LTI launch parameters.
> - Changed the login route handler to deal with multiple HTTP methods.
> - Added figlet on deploy.
> - Added update notifier.