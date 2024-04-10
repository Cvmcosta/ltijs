
<div align="center">
	<br>
	<br>
	<a href="https://cvmcosta.github.io/ltijs"><img width="360" src="logo-300.svg"></img></a>
  <a href="https://site.imsglobal.org/certifications/coursekey/ltijs"​ target='_blank'><img width="80" src="https://www.imsglobal.org/sites/default/files/IMSconformancelogoREG.png" alt="IMS Global Certified" border="0"></img></a>
</div>


### CHANGELOG

#### V5.9.4
> 2024-04-10
> - Updated dependencies.
> - Added `useDeepLinking` option to dynamic registration configurations. Allowing tools to disable deep linking when registering with platforms.

*I am finally back to work on this library, planning to migrate it to Typescript and add some missing features like cookieless login. - CVM*

#### V5.7.5
> 2021-05-13
> - Fix authentication flow using JWK_SET.

#### V5.7.4
> 2021-05-12
> - Fix in Dynamic Registration when flow is started in a new page.

#### V5.7.0
> 2021-04-05
> - Created new `authorizationServer` Platform registration field used as the `aud` claim for requesting access tokens. Platform methods usage is unchanged.
> - Create new `platformAuthorizationServer` Platform method to retrieve or set the authorization server. Value defaults to the access token endpoint.

#### V5.6.6
> 2021-01-29
> - Added the capability to remove the limit of number of pages returned by the Names and Roles Service.


#### V5.6.5
> 2021-01-27
> - Fixed bug where Blackboard would not see access token request iat and exp claims.
> - Fixed bug where Blackboard would not accept the generated access token due to the "bearer" word not being capitalized.

#### V5.6.4
> 2021-01-26
> - Fixed bug where domain generation would ignore port numbers in the Dynamic Registration flow.

#### V5.6.3
> 2021-01-26
> - Added a new error message `MISSING_VALIDATION_COOKIE` used when the `state` cookie is not present.

#### V5.6.0
> 2021-01-25
> - Removed `invalidToken` and `sessionTimeout` routes, Ltijs no longer redirects to error routes, it simply calls the handler methods `onInvalidToken` and `onSessionTimeout`.
> - Error handlers sill work in the exact same way.
> - Fixed a spelling error in the Dynamic Registration Service that caused Ltijs to be unable to identify the LMS Family. Big Thanks to @lselden for the pull request!

#### V5.5.7
> 2020-12-11
> - Added the possibility to customize Login Platform errors (Unregistered or Inactive Platform).

#### V5.5.5
> 2020-11-30
> - Fixed bug where passing `false` to `platformActive()` method would not alter the platform status.

#### V5.5.4
> 2020-11-29
> - Added support for dynamic registration flow customization. Pending documentation.

#### V5.5.3
> 2020-11-29
> - Added support for Tool description in the Dynamic Registration Service

#### V5.5.0
> 2020-11-24
> - Released Dynamic Registration Service.

#### V5.4.9
> 2020-11-19
> - Added req.query alterantive for Typescript ltiaas users.

#### V5.4.8
> 2020-11-17
> - Fixed vulnerability related to URI component decoding.

#### V5.4.6
> 2020-10-30
> - Added support for URL hashes to lti.redirect().

#### V5.4.5
> 2020-10-23
> - New optional authorization model `LTIK-AUTH-V1`. Pending documentation.

#### V5.4.4
> 2020-10-21
> - Improved error handling. Now rethrows errors instead of creating new ones, keeping the stack intact.

#### V5.4.3
> 2020-10-20
> - Improved `limit` functionality implementation on the Grades service. `getScores` and `getLineItems` now return an object containing the `scores` and `lineItems` fields respectively. Added support for `url` parameter, used alongside the `next` field returned on incomplete list requests.

#### V5.4.2
> 2020-10-18
> - Updated `lti.whitelist()` method, now appends routes to array when called multiple times, instead of replacing.

#### V5.4.1
> 2020-10-14
> - Updated deep linking parameters to receive `errMessage` and `errLog` instead of `errmessage` and `errlog` to make API more consistent. Kept old parameters to ensure compatibility.

#### V5.4.0
> 2020-10-02
> - Created new `Platform.platformJSON()` that returns the platform information as a JSON object.
> - Deprecated `Platform.platformAuthEndpoint()` in favor of `Platform.platformAuthenticationEndpoint()` to improve overall consistency.
> - Added catch block to invalidTokenCallback handler in order to prevent errors when receiving invalid JSON as error message.


#### V5.3.9
> 2020-09-29
> - Added new methods `submitScore` and `getScores` to Grades service that target one specific lineitem receiving the lineItemId as parameter. The `scorePublish` and `result` methods will be deprecated in favor of a less error prone way of accessing the Grades service.
> - Memberships method `getMembers` now has the `pages` parameter set to 1 by default.
> - Update Ltijs logo figlet.

#### V5.3.8
> 2020-09-23
> - Added lti.updatePlatformById() method. Documentation pending.

#### V5.3.7
> 2020-09-21
> - Changes to `platform.platformAuthConfig()` method, now accepts alterations to only one of the values.
> - ScoreMaximum of grades is now only passed when scoreGiven is present.
> - Created `resourceLinkId` option for names and roles service, representing the `rlid` option. 

#### V5.3.6
> 2020-09-20
> - Minor change to error messages to improve consistency.

#### V5.3.5
> 2020-09-19
> - Fixes Deep Linking bug where it would return an error if no option was passed. Added option parameter validation.

#### V5.3.4
> 2020-09-18
> - Created new methods on Grades Service: getLineItemById(), updateLineItemById() and deleteLineItemById. Pending documentation.
> - Passing the id field on the scorePublish() and result() methods now use the getLineItemById internally instead of getLineItems().
> - Added tests for the new methods.
> - Altered some error messages to improve consistency.

#### V5.3.3
> 2020-09-14
> - Fixed bug in Grades Service where limit would be applied before special filters `id` and `label`, causing the query to return an empty array.
> - Added error response to the `result` Grades method, instead of just ignoring errors and only returning successfull requests.
> - Changed `result` response field `lineItem` to `lineitem`, in order to maintain consistency.

#### V5.3.2
> 2020-09-13
> - Fixed bug in Names and Roles Service where url parameter wouldnt work if the limit parameter was also set.

#### V5.3.0
> 2020-09-11
> - Fixed bug where `contextToken` would not show up when `console.log()` was used to log the `idtoken`.
> - Added `query` option to `lti.redirect()` to easily add query parameters to the redirection target.
> - Added a target endpoint cleanup functionality to the login flow to deal with LMSs restrictive URL matching that prevents deep linking created urls to have query parameter. A more in depth explanation can be found here: [The issue with Redirection URIs](https://cvmcosta.github.io/ltijs/#/redirectionuris).
> - Added a new `state` table to the database to store launch specific query parameters (Addressed in the document cited above).
> - Released a new version of [ltijs-sequelize](https://github.com/Cvmcosta/ltijs-sequelize) that accomodates the changes. The new version also added indexes to improve performance.
> - Applied error message pattern to errors thrown within the registration route.

#### V5.2.1
> 2020-08-31
> BREAKING CHANGES
> - Some fields were moved from the `idtoken` to the `contexttoken`, The `roles`, `endpoint`, `lis` and `namesRoles` fields change with the launch context, and cannot be treated as static values. They can now be found inside the `contexttoken` object along with all the other context specific information.
> - A field `platformId` was added to the `idtoken` object. Represents the platform id inside the LTI provider.
> - Changed Grades and NamesAndRoles services accordingly.
> - Added the `lti.getPlatformById()` and `lti.deletePlatformById()` methods. As well as the `Platform.platformId()` method.
> - Released a new version of [ltijs-sequelize](https://github.com/Cvmcosta/ltijs-sequelize) that accommodates the changes. It is recommended to delete the `idtoken` and `contexttoken` tables of your preexisting database when updating, the schema changes can cause errors on relational databases. These tables are repopulated on every launch, so no relevant information will be lost.

#### V5.1.0
> 2020-08-29
> IMPROVEMENTS
> - Improved error logging for the launch and authentication flow. Now the invalidToken and sessionTimeout routes have access to a `res.locals.err` object containing information about the error. The default callback methods return this object as a response.

#### V5.0.3
> 2020-08-08
> UPDATE
> - Updated Helmet dependency. Tweaked `Server.js` to deal with new security policies introduced.

#### V5.0.2
> 2020-07-29
> FIXES
> - Fixed issue where Names and Roles service would not parse the link header correctly if there were more than one link.
> - Names and Roles `getMembers()` method now returns the `differences` link in the `result` object if it is present in the response headers.

#### V5.0.0
> 2020-07-17

> Got the IMS LTI® Advantage Complete Certification!

> BREAKING CHANGES
> - Provider no longer has a contructor, instead it has a [setup() method](https://cvmcosta.me/ltijs/#/provider?id=setting-up-ltijs) that takes the exact same arguments.
> - [Provider.getPlatform](https://cvmcosta.me/ltijs/#/provider?id=retrieving-a-platform) now takes two arguments (platformUrl and clientId). Using only platformUrl results in a Platform array being returned.
> - [Provider.deletePlatform](https://cvmcosta.me/ltijs/#/provider?id=deleting-a-platform) now takes two arguments (platformUrl and clientId). Using only platformUrl throws an error to avoid accidental deletion of multiple platforms.
> - Provider now works as a singleton. This allows it to be [accessed across multiple files](https://cvmcosta.me/ltijs/#/provider?id=using-ltijs), calling setup only once.
> - Changed authentication flow to better implement LTI® 1.3 security protocol, which might cause issues due to cross domain cookie limitations in certain development environments.
> - Added [devMode flag](https://cvmcosta.me/ltijs/#/provider?id=development-mode) to setup options to deal with the possible issues caused by cross domain cookies.
> - Removed onConnect options and [added onInvalidToken and onSessionTimeout methods](https://cvmcosta.me/ltijs/#/provider?id=callbacks).
> - Changed how [reserved endpoints](https://cvmcosta.me/ltijs/#/provider?id=reserved-endpoint-configuration) are mentioned in methods and options from Urls to Routes. Ex1: **lti.appUrl() => lti.appRoute()**. Ex2: **... loginUrl: '/app'}) => ... loginRoute: '/app'})**
> - Changed Platform.remove() to Platform.delete().
> - Renamed [redirect method`s](https://cvmcosta.me/ltijs/#/provider?id=redirecting-with-ltijs) option from **isNewResource** to **newResource**.
> - No longer sets automatic cookie domain for external redirection. Added a [cookie option](https://cvmcosta.me/ltijs/#/provider?id=cookie-configuration) `domain` that can be used to specify a domain and let cookies be shared between subdomains.
> - Bumped required version of Ltijs to **10.19.0**.
> - Changed error handling policy, now Ltijs **allows the user to decide how to handle errors** instead of catching them inside the methods, logging them and returning false.
> - Removed Logger functionality.

> NEW FEATURES
> - Ltijs now allows multiple entry points to be used for the launch instead of only allowing the main app route.
> - Redirect method now works with non LTI® requests.
> - Added a [maxAge parameter](https://cvmcosta.me/ltijs/#/provider?id=token-max-age-allowed) to `setup()` method options, where the developer can choose the idtoken's maximun allowed age. Defaults to 10 seconds and can be turned off entirely by setting the parameter to false.
> - Added a [domain](https://cvmcosta.me/ltijs/#/provider?id=cookie-configuration) field to the cookie options of the 'setup()' method, that can be used to specify a domain and let cookies be shared between subdomains.
> - [Provider.whitelist](https://cvmcosta.me/ltijs/#/provider?id=whitelisting-routes) now accepts Regex as input.
> - Added a new Database method Replace().
> - Added indexes to the MondoDB schemas.
> - Added [debug option](https://cvmcosta.me/ltijs/#/provider?id=database-configuration) to MongoDB options.
> - Added support for multi tenant by taking the deploymentId into consideration when storing and retrieving information.

> IMPROVEMENTS
> - Improved performance with new authentication system that only generates one cookie for every platform-user pair and stores relevant data in the Ltik so it doesnt have to reassemble platform or context codes.
> - Improved redirection performance since it no longer rebuilds Ltik.
> - Refactored some code to use native Node APIs and remove unecessary dependencies, reducing bundle size.
> - Updated dependencies.
> - Rewrote tests to increase coverage and include IMS Certification Tests.

> FIXES
> - Removed hability to change platform Url.
> - Removed hability to change platform clientId.
> - General fixes to Grade Service to get certification.
> - Fixed bug where Ltijs would create duplicates of platforms and keys if ran in cluster mode.
> - Provider.deletePlatform no longer returns false when the platform doesn't exist.
> - Redirection method now validates it's arguments.
> - Changed key generation name to better reflect it's functionality.

#### V4.0.0
> 2020-05-15
> MAJOR CHANGE
> - Implemented Names and Roles Service.
> - Improved Database insertion method.
> - Separated generated access tokens based on their scope.
> - Improved Access token generation method with the ability to specify the scope.
> - Changed Grade Service methods names to improve code consistency, old method names are deprecated and will keep working until the 5.0 release.
> - Started process of certifying Ltijs with the IMS's LTI® Advantage Conformance Certificate.

#### V3.6.2
> 2020-04-15
> MINOR CHANGE
> - Fixed bug where path.join would not work correctly on windows and path prefixing was broken.
> - Now platform configuration can be updated by calling the register function with the changed values. (And the same platform URL).

#### V3.6.0
> 2020-04-13
> - Added serveless mode, allows Ltijs to be used as a middleware.
> - Serverless mode theoretically also allows Ltijs to be used with AWS. *This has not been tested yet.*
> - Special thanks to [Fadeenk](https://github.com/fadeenk) for his work on adding support for route prefixes.

#### V3.5.0
> 2020-04-01
> MAJOR CHANGE
> - Changed login validation process. Now uses the database instead of cookies, to avoid cors issues. THIS BREAKS DATABASE PLUGIN COMPATIBILITY.
> - Moved Cookies options to the main constructor (kept onConnect options for retro compatibility).
> - Fixed redirection bug where the wrong url would be formed if the target path contained a port but no paths.
> - The Database is no longer a private parameter and can be accessed outside the main Lti object.


#### V3.1.5
> 2020-03-20
> MINOR CHANGE
> - Added experimental serverless option to deploy methof. Attempting to use Ltijs with AWS.
> - Changed how Ltijs handles a server startup error, now it gracefully shutdowns and cloeses database connections.
> - Cleaned up server startup code.
> - Added log server startup debug message.
> - Added keysetRoute to startup message.
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
> - Added the `unique` parameter to the platformUrl field, that deals with the bug that occurred when using ltijs in cluster mode with pm2, where platforms would registered more than one time.
> - Added error handling to the registration method. Now it deletes the previously generated key pair kid.

#### V2.5.3

> 2020-02-28
> MINOR CHANGE
> - Fixing error on redirect method. Now accepts queries correctly.

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
> - Silent option added to the deploy method, that suppresses the initial console logs.
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
> - Changed Request builder to include some optional LTI® launch parameters.
> - Changed the login route handler to deal with multiple HTTP methods.
> - Added figlet on deploy.
> - Added update notifier.