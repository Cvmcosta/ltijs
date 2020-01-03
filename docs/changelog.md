
<div align="center">
	<br>
	<br>
	<a href="https://cvmcosta.github.io/ltijs"><img width="360" src="logo-300.svg"></img></a>
</div>


### CHANGELOG

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