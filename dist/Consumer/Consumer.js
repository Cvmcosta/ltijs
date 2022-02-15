"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _classPrivateFieldSet2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldSet"));

var _classPrivateFieldGet2 = _interopRequireDefault(require("@babel/runtime/helpers/classPrivateFieldGet"));

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) { symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); } keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(Object(source), true).forEach(function (key) { (0, _defineProperty2.default)(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

/* eslint-disable require-atomic-updates */

/* eslint-disable no-useless-escape */

/* Main class for the Consumer functionalities */
// Dependencies
const provMainDebug = require('debug')('lti:main');

const url = require('fast-url-parser'); // Services


const Core = require('./Advantage/Services/Core');

const DeepLinking = require('./Advantage/Services/DeepLinking');

const NamesAndRoles = require('./Advantage/Services/NamesAndRoles');

const Grades = require('./Advantage/Services/Grades'); // Classes


const Auth = require('./Advantage/Classes/Auth');

const Tool = require('./Advantage/Classes/Tool');

const ToolLink = require('./Advantage/Classes/ToolLink');

const Server = require('./Advantage/Classes/Server');

const Keyset = require('../GlobalUtils/Keyset'); // Database


const Database = require('../GlobalUtils/Database');

const MongoDB = require('../GlobalUtils/MongoDB/MongoDB'); // Helpers


const messageTypes = require('../GlobalUtils/Helpers/messageTypes');

const roles = require('../GlobalUtils/Helpers/roles');

const scopes = require('../GlobalUtils/Helpers/scopes');

const privacyLevels = require('../GlobalUtils/Helpers/privacy');
/**
 * @descripttion LTI Consumer Class that implements the LTI 1.3 protocol and services.
 */


var _consumer = /*#__PURE__*/new WeakMap();

var _consumerUrl = /*#__PURE__*/new WeakMap();

var _loginRoute = /*#__PURE__*/new WeakMap();

var _accesstokenRoute = /*#__PURE__*/new WeakMap();

var _keysetRoute = /*#__PURE__*/new WeakMap();

var _deepLinkingResponseRoute = /*#__PURE__*/new WeakMap();

var _membershipsRoute = /*#__PURE__*/new WeakMap();

var _lineItemsRoute = /*#__PURE__*/new WeakMap();

var _ENCRYPTIONKEY = /*#__PURE__*/new WeakMap();

var _legacy = /*#__PURE__*/new WeakMap();

var _setup = /*#__PURE__*/new WeakMap();

var _coreLaunchCallback = /*#__PURE__*/new WeakMap();

var _deepLinkingLaunchCallback = /*#__PURE__*/new WeakMap();

var _deepLinkingResponseCallback = /*#__PURE__*/new WeakMap();

var _membershipsRequestCallback = /*#__PURE__*/new WeakMap();

var _lineItemsRequestCallback = /*#__PURE__*/new WeakMap();

var _lineItemRequestCallback = /*#__PURE__*/new WeakMap();

var _gradesRequestCallback = /*#__PURE__*/new WeakMap();

var _invalidLoginRequestCallback = /*#__PURE__*/new WeakMap();

var _invalidDeepLinkingResponseCallback = /*#__PURE__*/new WeakMap();

var _invalidAccessTokenRequestCallback = /*#__PURE__*/new WeakMap();

var _server = /*#__PURE__*/new WeakMap();

class Consumer {
  constructor() {
    _consumer.set(this, {
      writable: true,
      value: void 0
    });

    _consumerUrl.set(this, {
      writable: true,
      value: void 0
    });

    _loginRoute.set(this, {
      writable: true,
      value: '/login'
    });

    _accesstokenRoute.set(this, {
      writable: true,
      value: '/accesstoken'
    });

    _keysetRoute.set(this, {
      writable: true,
      value: '/keys'
    });

    _deepLinkingResponseRoute.set(this, {
      writable: true,
      value: '/deeplinking'
    });

    _membershipsRoute.set(this, {
      writable: true,
      value: '/memberships'
    });

    _lineItemsRoute.set(this, {
      writable: true,
      value: '/lineitems'
    });

    _ENCRYPTIONKEY.set(this, {
      writable: true,
      value: void 0
    });

    _legacy.set(this, {
      writable: true,
      value: false
    });

    _setup.set(this, {
      writable: true,
      value: false
    });

    _coreLaunchCallback.set(this, {
      writable: true,
      value: async (payload, req, res) => {
        return res.status(500).send({
          status: 500,
          error: 'Internal Server Error',
          details: {
            message: 'MISSING_CORE_LAUNCH_CALLBACK'
          }
        });
      }
    });

    _deepLinkingLaunchCallback.set(this, {
      writable: true,
      value: async (payload, req, res) => {
        return res.status(500).send({
          status: 500,
          error: 'Internal Server Error',
          details: {
            message: 'MISSING_DEEPLINKING_LAUNCH_CALLBACK'
          }
        });
      }
    });

    _deepLinkingResponseCallback.set(this, {
      writable: true,
      value: async (payload, req, res) => {
        return res.status(500).send({
          status: 500,
          error: 'Internal Server Error',
          details: {
            message: 'MISSING_DEEPLINKING_REQUEST_CALLBACK'
          }
        });
      }
    });

    _membershipsRequestCallback.set(this, {
      writable: true,
      value: async (payload, req, res) => {
        return res.status(500).send({
          status: 500,
          error: 'Internal Server Error',
          details: {
            message: 'MISSING_MEMBERSHIPS_REQUEST_CALLBACK'
          }
        });
      }
    });

    _lineItemsRequestCallback.set(this, {
      writable: true,
      value: async (payload, req, res) => {
        return res.status(500).send({
          status: 500,
          error: 'Internal Server Error',
          details: {
            message: 'MISSING_LINEITEMS_REQUEST_CALLBACK'
          }
        });
      }
    });

    _lineItemRequestCallback.set(this, {
      writable: true,
      value: async (payload, req, res) => {
        return res.status(500).send({
          status: 500,
          error: 'Internal Server Error',
          details: {
            message: 'MISSING_LINEITEM_REQUEST_CALLBACK'
          }
        });
      }
    });

    _gradesRequestCallback.set(this, {
      writable: true,
      value: async (payload, req, res) => {
        return res.status(500).send({
          status: 500,
          error: 'Internal Server Error',
          details: {
            message: 'MISSING_GRADES_REQUEST_CALLBACK'
          }
        });
      }
    });

    _invalidLoginRequestCallback.set(this, {
      writable: true,
      value: async (req, res) => {
        return res.status(401).send(res.locals.err);
      }
    });

    _invalidDeepLinkingResponseCallback.set(this, {
      writable: true,
      value: async (req, res) => {
        return res.status(400).send(res.locals.err);
      }
    });

    _invalidAccessTokenRequestCallback.set(this, {
      writable: true,
      value: async (req, res) => {
        return res.status(400).send(res.locals.err);
      }
    });

    _server.set(this, {
      writable: true,
      value: void 0
    });
  }

  /**
     * @description Provider configuration method.
     * @param {String} encryptionkey - Secret used to sign cookies and encrypt other info.
     * @param {Object} database - Database configuration.
     * @param {String} database.url - Database Url (Ex: mongodb://localhost/applicationdb).
     * @param {Object} [database.plugin] - If set, must be the Database object of the desired database plugin.
     * @param {Boolean} [database.debug] - If set to true, enables mongoose debug mode.
     * @param {Object} [database.connection] - MongoDB database connection options (Ex: user, pass)
     * @param {String} [database.connection.user] - Database user for authentication if needed.
     * @param {String} [database.conenction.pass] - Database pass for authentication if needed.
     * @param {Object} options - Lti Provider options.
     * @param {String} options.consumerUrl - Main Consumer URL.
     * @param {String} [options.loginRoute = '/login'] - LTI Consumer login route. If no option is set '/login' is used.
     * @param {String} [options.accesstokenRoute = '/accesstoken'] - LTI Consumer access token generation endpoint.
     * @param {String} [options.keysetRoute = '/keys'] - LTI Consumer public jwk keyset route. If no option is set '/keys' is used.
     * @param {String} [options.deepLinkingResponseRoute = '/deeplinking'] - LTI Consumer deep linking response route. If no option is set '/deeplinking' is used.
     * @param {String} [options.membershipsRoute = '/memberships'] - LTI Consumer Memeberships route. If no option is set '/memberships' is used.
     * @param {Boolean} [options.https = false] - Set this as true in development if you are not using any web server to redirect to your tool (like Nginx) as https and are planning to configure ssl through Express.
     * @param {Object} [options.ssl] - SSL certificate and key if https is enabled.
     * @param {String} [options.ssl.key] - SSL key.
     * @param {String} [options.ssl.cert] - SSL certificate.
     * @param {String} [options.staticPath] - The path for the static files your application might serve (Ex: _dirname+"/public")
     * @param {Boolean} [options.cors = true] - If set to false, disables cors.
     * @param {Function} [options.serverAddon] - Allows the execution of a method inside of the server contructor. Can be used to register middlewares.
     */
  setup(encryptionkey, database, options) {
    if ((0, _classPrivateFieldGet2.default)(this, _setup)) throw new Error('PROVIDER_ALREADY_SETUP');
    if (!encryptionkey) throw new Error('MISSING_ENCRYPTION_KEY');
    if (!database) throw new Error('MISSING_DATABASE_CONFIGURATION');
    if (!options || !options.consumerUrl) throw new Error('MISSING_CONSUMER_URL_CONFIGURATION');
    if (options && options.https && (!options.ssl || !options.ssl.key || !options.ssl.cert)) throw new Error('MISSING_SSL_KEY_CERTIFICATE');
    if (options && options.loginRoute) (0, _classPrivateFieldSet2.default)(this, _loginRoute, options.loginRoute);
    if (options && options.keysetRoute) (0, _classPrivateFieldSet2.default)(this, _keysetRoute, options.keysetRoute);
    if (options && options.accesstokenRoute) (0, _classPrivateFieldSet2.default)(this, _accesstokenRoute, options.accesstokenRoute);
    if (options && options.deepLinkingResponseRoute) (0, _classPrivateFieldSet2.default)(this, _deepLinkingResponseRoute, options.deepLinkingResponseRoute);
    if (options && options.membershipsRoute) (0, _classPrivateFieldSet2.default)(this, _membershipsRoute, options.membershipsRoute);
    if (options && options.legacy === true) (0, _classPrivateFieldSet2.default)(this, _legacy, true); // Creating consumer configuration object

    (0, _classPrivateFieldSet2.default)(this, _consumerUrl, options.consumerUrl);
    (0, _classPrivateFieldSet2.default)(this, _consumer, url.parse((0, _classPrivateFieldGet2.default)(this, _consumerUrl)));
    (0, _classPrivateFieldGet2.default)(this, _consumer).url = (0, _classPrivateFieldGet2.default)(this, _consumerUrl);
    (0, _classPrivateFieldGet2.default)(this, _consumer).accesstokenRoute = (0, _classPrivateFieldGet2.default)(this, _accesstokenRoute);
    (0, _classPrivateFieldGet2.default)(this, _consumer).deepLinkingResponseRoute = (0, _classPrivateFieldGet2.default)(this, _deepLinkingResponseRoute);
    (0, _classPrivateFieldGet2.default)(this, _consumer).membershipsRoute = (0, _classPrivateFieldGet2.default)(this, _membershipsRoute);
    (0, _classPrivateFieldGet2.default)(this, _consumer).lineItemsRoute = (0, _classPrivateFieldGet2.default)(this, _lineItemsRoute);
    (0, _classPrivateFieldGet2.default)(this, _consumer).membershipsUrl = url.format({
      protocol: (0, _classPrivateFieldGet2.default)(this, _consumer).protocol,
      hostname: (0, _classPrivateFieldGet2.default)(this, _consumer).hostname,
      port: (0, _classPrivateFieldGet2.default)(this, _consumer).port,
      auth: (0, _classPrivateFieldGet2.default)(this, _consumer).auth,
      hash: (0, _classPrivateFieldGet2.default)(this, _consumer).hash,
      pathname: (0, _classPrivateFieldGet2.default)(this, _membershipsRoute)
    });
    (0, _classPrivateFieldGet2.default)(this, _consumer).lineItemsUrl = url.format({
      protocol: (0, _classPrivateFieldGet2.default)(this, _consumer).protocol,
      hostname: (0, _classPrivateFieldGet2.default)(this, _consumer).hostname,
      port: (0, _classPrivateFieldGet2.default)(this, _consumer).port,
      auth: (0, _classPrivateFieldGet2.default)(this, _consumer).auth,
      hash: (0, _classPrivateFieldGet2.default)(this, _consumer).hash,
      pathname: (0, _classPrivateFieldGet2.default)(this, _lineItemsRoute)
    }); // Encryption Key

    (0, _classPrivateFieldSet2.default)(this, _ENCRYPTIONKEY, encryptionkey); // Setup Databse

    let connector;
    if (!database.plugin) connector = new MongoDB(database);else connector = database.plugin;
    /**
     * @description Database object.
     */

    this.Database = Database;
    this.Database.setup((0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY), connector, {
      type: 'CONSUMER',
      legacy: (0, _classPrivateFieldGet2.default)(this, _legacy)
    }); // Setting up Server

    (0, _classPrivateFieldSet2.default)(this, _server, new Server(options ? options.https : false, options ? options.ssl : false, (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY), options ? options.cors : true, options ? options.serverAddon : false));
    if (options && options.staticPath) (0, _classPrivateFieldGet2.default)(this, _server).setStaticPath(options.staticPath);
    /**
     * @description Scopes Helper
     */

    this.Scopes = scopes;
    /**
     * @description Message Type Helper
     */

    this.MessageTypes = messageTypes;
    /**
     * @description Roles Helper
     */

    this.Roles = roles;
    /**
     * @description Privacy Levels Helper
     */

    this.PrivacyLevels = privacyLevels;
    /**
     * @description NamesAndRoles Service
     */

    this.NamesAndRoles = NamesAndRoles;
    /**
     * @description Grades Service
     */

    this.Grades = Grades;
    /**
     * @description Express server object.
     */

    this.app = (0, _classPrivateFieldGet2.default)(this, _server).app; // Authentication request route

    this.app.all((0, _classPrivateFieldGet2.default)(this, _loginRoute), async (req, res, next) => {
      try {
        res.locals.payload = await Auth.validateLoginRequest(_objectSpread(_objectSpread({}, req.query), req.body), (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY));
        if (res.locals.payload.params.type === messageTypes.DEEPLINKING_LAUNCH) return (0, _classPrivateFieldGet2.default)(this, _deepLinkingLaunchCallback).call(this, res.locals.payload, req, res, next);
        return (0, _classPrivateFieldGet2.default)(this, _coreLaunchCallback).call(this, res.locals.payload, req, res, next);
      } catch (err) {
        provMainDebug(err);
        res.locals.err = {
          status: 401,
          error: 'Unauthorized',
          details: {
            description: 'Error validating login request',
            message: err.message,
            bodyReceived: req.body,
            queryReceived: req.query
          }
        };
        return (0, _classPrivateFieldGet2.default)(this, _invalidLoginRequestCallback).call(this, req, res, next);
      }
    }); // Deep Linking response route

    this.app.post((0, _classPrivateFieldGet2.default)(this, _deepLinkingResponseRoute), async (req, res, next) => {
      try {
        res.locals.payload = await Auth.validateDeepLinkingResponse(req.body, req.query, (0, _classPrivateFieldGet2.default)(this, _consumer));
        return (0, _classPrivateFieldGet2.default)(this, _deepLinkingResponseCallback).call(this, res.locals.payload, req, res, next);
      } catch (err) {
        provMainDebug(err);
        res.locals.err = {
          status: 400,
          error: 'Bad Request',
          details: {
            description: 'Error validating deep linking response',
            message: err.message,
            bodyReceived: req.body
          }
        };
        return (0, _classPrivateFieldGet2.default)(this, _invalidDeepLinkingResponseCallback).call(this, req, res, next);
      }
    }); // Access token generation route

    this.app.post((0, _classPrivateFieldGet2.default)(this, _accesstokenRoute), async (req, res, next) => {
      try {
        const accessToken = await Auth.generateAccessToken(req.body, (0, _classPrivateFieldGet2.default)(this, _consumer), (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY));
        return res.status(200).send(accessToken);
      } catch (err) {
        provMainDebug(err);
        res.locals.err = {
          status: 400,
          error: 'Bad Request',
          details: {
            description: 'Error validating access token request',
            message: err.message,
            bodyReceived: req.body
          }
        };
        return (0, _classPrivateFieldGet2.default)(this, _invalidAccessTokenRequestCallback).call(this, req, res, next);
      }
    }); // Keyset generation route

    this.app.get((0, _classPrivateFieldGet2.default)(this, _keysetRoute), async (req, res, next) => {
      try {
        const keyset = await Keyset.build();
        return res.status(200).send(keyset);
      } catch (err) {
        provMainDebug(err);
        return res.status(500).send({
          status: 500,
          error: 'Internal Server Error',
          details: {
            message: err.message
          }
        });
      }
    }); // LTI Services

    const validateAccessToken = async (authorization, scope, res) => {
      try {
        if (!authorization) throw new Error('MISSING_AUTHORIZATION_HEADER');
        const parts = authorization.split(' ');

        if (parts.length === 2 && (parts[0] === 'Bearer' || parts[0] === 'bearer')) {
          return Auth.validateAccessToken(parts[1], scope, (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY));
        }

        throw new Error('INVALID_AUTHORIZATION_HEADER');
      } catch (err) {
        provMainDebug(err);
        return res.status(401).send({
          status: 401,
          error: 'Unauthorized',
          details: {
            description: 'Invalid access token or scopes',
            message: err.message
          }
        });
      }
    };

    this.app.get((0, _classPrivateFieldGet2.default)(this, _membershipsRoute) + '/:context', async (req, res, next) => {
      try {
        const accessToken = await validateAccessToken(req.headers.authorization, scopes.MEMBERSHIPS, res);
        const query = new URLSearchParams(req.query).toString();
        const serviceEndpoint = (0, _classPrivateFieldGet2.default)(this, _consumer).membershipsUrl + '/' + req.params.context + '?' + query;
        res.locals.payload = {
          // Move to service class
          service: 'MEMBERSHIPS',
          clientId: accessToken.clientId,
          endpoint: serviceEndpoint,
          params: {
            context: req.params.context,
            privacy: accessToken.privacy,
            role: req.query.role,
            limit: req.query.limit,
            next: req.query.next,
            resourceLinkId: req.query.rlid
          }
        };
        return (0, _classPrivateFieldGet2.default)(this, _membershipsRequestCallback).call(this, res.locals.payload, req, res, next);
      } catch (err) {
        provMainDebug(err);
        return res.status(400).send({
          status: 400,
          error: 'Bad Request',
          details: {
            description: 'Error validating access token request',
            message: err.message,
            bodyReceived: req.body
          }
        });
      }
    });
    this.app.all((0, _classPrivateFieldGet2.default)(this, _lineItemsRoute) + '/:context', async (req, res, next) => {
      try {
        let accessToken;

        if (req.method === 'GET') {
          try {
            accessToken = await validateAccessToken(req.headers.authorization, scopes.LINEITEM_READONLY, res);
          } catch (_unused) {
            accessToken = await validateAccessToken(req.headers.authorization, scopes.LINEITEM, res);
          }
        } else if (req.method === 'POST') {
          accessToken = await validateAccessToken(req.headers.authorization, scopes.LINEITEM, res);
        } else {
          return res.status(400).send({
            status: 400,
            error: 'Bad Request',
            details: {
              description: 'Invalid request method.'
            }
          });
        } // Creating payload


        const serviceEndpoint = (0, _classPrivateFieldGet2.default)(this, _consumer).lineItemsUrl + '/' + req.params.context;
        res.locals.payload = {
          // Move to service class
          service: 'LINEITEMS',
          action: req.method,
          clientId: accessToken.clientId,
          endpoint: serviceEndpoint,
          params: {
            context: req.params.context
          }
        };

        if (req.method === 'GET') {
          res.locals.payload.params.resourceLinkId = req.query.resource_link_id;
          res.locals.payload.params.resourceId = req.query.resource_id;
          res.locals.payload.params.tag = req.query.tag;
          res.locals.payload.params.limit = req.query.limit;
        } else if (req.method === 'POST') res.locals.payload.params.lineItem = req.body;

        return (0, _classPrivateFieldGet2.default)(this, _lineItemsRequestCallback).call(this, res.locals.payload, req, res, next);
      } catch (err) {
        provMainDebug(err);
        return res.status(400).send({
          status: 400,
          error: 'Bad Request',
          details: {
            description: 'Error validating access token request',
            message: err.message,
            bodyReceived: req.body
          }
        });
      }
    });
    this.app.all((0, _classPrivateFieldGet2.default)(this, _lineItemsRoute) + '/:context/lineitem/:lineItem', async (req, res, next) => {
      try {
        let accessToken;

        if (req.method === 'GET') {
          try {
            accessToken = await validateAccessToken(req.headers.authorization, scopes.LINEITEM_READONLY, res);
          } catch (_unused2) {
            accessToken = await validateAccessToken(req.headers.authorization, scopes.LINEITEM, res);
          }
        } else if (req.method === 'PUT' || req.method === 'DELETE') {
          accessToken = await validateAccessToken(req.headers.authorization, scopes.LINEITEM, res);
        } else {
          return res.status(400).send({
            status: 400,
            error: 'Bad Request',
            details: {
              description: 'Invalid request method.'
            }
          });
        } // Creating payload


        const serviceEndpoint = (0, _classPrivateFieldGet2.default)(this, _consumer).lineItemsUrl + '/' + req.params.context + '/lineitem/' + req.params.lineItem;
        res.locals.payload = {
          // Move to service class
          service: 'LINEITEM',
          action: req.method,
          clientId: accessToken.clientId,
          endpoint: serviceEndpoint,
          params: {
            context: req.params.context,
            lineItem: req.params.lineItem
          }
        };
        if (req.method === 'PUT') res.locals.payload.params.update = req.body;
        return (0, _classPrivateFieldGet2.default)(this, _lineItemRequestCallback).call(this, res.locals.payload, req, res, next);
      } catch (err) {
        provMainDebug(err);
        return res.status(400).send({
          status: 400,
          error: 'Bad Request',
          details: {
            description: 'Error validating access token request',
            message: err.message,
            bodyReceived: req.body
          }
        });
      }
    });
    this.app.all((0, _classPrivateFieldGet2.default)(this, _lineItemsRoute) + '/:context/lineitem/:lineItem/:service', async (req, res, next) => {
      try {
        let accessToken;

        if (req.method === 'GET' && req.params.service === 'results') {
          accessToken = await validateAccessToken(req.headers.authorization, scopes.RESULTS, res);
        } else if (req.method === 'POST' && req.params.service === 'scores') {
          accessToken = await validateAccessToken(req.headers.authorization, scopes.SCORES, res);
        } else {
          return res.status(400).send({
            status: 400,
            error: 'Bad Request',
            details: {
              description: 'Invalid service URL or method.'
            }
          });
        } // Creating payload


        const serviceEndpoint = (0, _classPrivateFieldGet2.default)(this, _consumer).lineItemsUrl + '/' + req.params.context + '/lineitem/' + req.params.lineItem;
        res.locals.payload = {
          // Move to service class
          service: 'GRADES',
          action: req.method,
          clientId: accessToken.clientId,
          endpoint: serviceEndpoint,
          params: {
            context: req.params.context,
            lineItem: req.params.lineItem
          }
        };

        if (req.method === 'GET') {
          res.locals.payload.params.user = req.query.user_id;
          res.locals.payload.params.limit = req.query.limit;
        } else if (req.method === 'POST') res.locals.payload.params.score = req.body;

        return (0, _classPrivateFieldGet2.default)(this, _gradesRequestCallback).call(this, res.locals.payload, req, res, next);
      } catch (err) {
        provMainDebug(err);
        return res.status(400).send({
          status: 400,
          error: 'Bad Request',
          details: {
            description: 'Error validating access token request.',
            message: err.message,
            bodyReceived: req.body
          }
        });
      }
    });
    (0, _classPrivateFieldSet2.default)(this, _setup, true);
    return this;
  }
  /**
     * @description Starts listening to a given port for LTI requests and opens connection to the database.
     * @param {Object} [options] - Deployment options.
     * @param {Number} [options.port] - Deployment port. 3000 by default.
     * @param {Boolean} [options.silent] - If true, disables initial startup message.
     * @param {Boolean} [options.serverless] - If true, Ltijs does not start an Express server instance. This allows usage as a middleware and with services like AWS. Ignores 'port' parameter.
     * @returns {Promise<true>}
     */


  async deploy(options) {
    if (!(0, _classPrivateFieldGet2.default)(this, _setup)) throw new Error('CONSUMER_NOT_SETUP');
    provMainDebug('Attempting to connect to database');

    try {
      await Database.connect();
      const conf = {
        port: 3000,
        silent: false
      };
      if (options && options.port) conf.port = options.port;
      if (options && options.silent) conf.silent = options.silent; // Starts server on given port

      if (options && options.serverless) console.log('Ltijs - Consumer started in serverless mode...');else {
        await (0, _classPrivateFieldGet2.default)(this, _server).listen(conf.port);
        provMainDebug('Ltijs - Consumer started listening on port: ', conf.port); // Startup message

        const message = 'LTI Consumer is listening on port ' + conf.port + '!\n\n LTI provider config: \n >Main URL: ' + (0, _classPrivateFieldGet2.default)(this, _consumerUrl) + '\n >Login Request Route: ' + (0, _classPrivateFieldGet2.default)(this, _loginRoute) + '\n >Access Token Generation Route: ' + (0, _classPrivateFieldGet2.default)(this, _accesstokenRoute) + '\n >Deep Linking Request Route: ' + (0, _classPrivateFieldGet2.default)(this, _deepLinkingResponseRoute) + '\n >Keyset Route: ' + (0, _classPrivateFieldGet2.default)(this, _keysetRoute);

        if (!conf.silent) {
          console.log('  _   _______ _____      _  _____\n' + ' | | |__   __|_   _|    | |/ ____|\n' + ' | |    | |    | |      | | (___  \n' + ' | |    | |    | |  _   | |\\___ \\ \n' + ' | |____| |   _| |_| |__| |____) |\n' + ' |______|_|  |_____|\\____/|_____/ \n\n', message);
        }
      } // Sets up gracefull shutdown

      process.on('SIGINT', async () => {
        await this.close(options);
        process.exit();
      });
      return true;
    } catch (err) {
      console.log('Error during deployment: ', err);
      await this.close(options);
      process.exit();
    }
  }
  /**
   * @description Closes connection to database and stops server.
   * @param {Object} [options] - Deployment options.
   * @param {Boolean} [options.silent] - If true, disables messages.
   * @returns {Promise<true>}
   */


  async close(options) {
    if (!options || options.silent !== true) console.log('\nClosing server...');
    await (0, _classPrivateFieldGet2.default)(this, _server).close();
    if (!options || options.silent !== true) console.log('Closing connection to the database...');
    await Database.close();
    if (!options || options.silent !== true) console.log('Shutdown complete.');
    return true;
  }
  /**
   * @description Generates Core launch self-submitting POST form
   * @param {String} clientId - Client Id of Tool being launched.
   * @param {String} toolLinkId - Tool link Id being launched.
   * @param {String} userId - Id for current user.
   * @param {String} resourceId - Identifier for resource holding toolLink in Platform.
   */


  async launchCore(clientId, toolLinkId, userId, resourceId) {
    return Core.launch(clientId, toolLinkId, userId, resourceId, (0, _classPrivateFieldGet2.default)(this, _consumerUrl), (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY));
  }
  /**
   * @description Generates DeepLinking launch self-submitting POST form
   * @param {String} clientId - Client Id of Tool being launched.
   * @param {String} userId - Id for current user.
   * @param {String} contextId - Identifier for the Deep Linking context.
   */


  async launchDeepLinking(clientId, userId, contextId) {
    return DeepLinking.launch(clientId, userId, contextId, (0, _classPrivateFieldGet2.default)(this, _consumerUrl), (0, _classPrivateFieldGet2.default)(this, _ENCRYPTIONKEY));
  }
  /**
   * @description Redirects to self-submitting ID Token form.
   * @param {Object} res - Express response object.
   * @param {String} idtoken - Information used to build the ID Token.
   */


  async sendIdToken(res, idtoken) {
    return Auth.buildIdTokenResponse(res, idtoken, (0, _classPrivateFieldGet2.default)(this, _consumer));
  }
  /**
   * @description Generates self-submitting ID Token form.
   * @param {String} payload - Valid login request object.
   * @param {String} idtoken - Information used to build the ID Token.
   */


  async buildIdTokenForm(payload, idtoken) {
    return Auth.buildIdTokenForm(payload, idtoken, (0, _classPrivateFieldGet2.default)(this, _consumer));
  }
  /**
   * @description Generates ID Token.
   * @param {String} payload - Valid login request object.
   * @param {String} idtoken - Information used to build the ID Token.
   */


  async buildIdToken(payload, idtoken) {
    return Auth.buildIdToken(payload, idtoken, (0, _classPrivateFieldGet2.default)(this, _consumer));
  }
  /**
   * @description Sets the callback function called whenever the Consumer receives a valid LTI 1.3 Core Login Request.
   * @param {Function} coreLaunchCallback - Callback function called whenever the Consumer receives a valid Core LTI 1.3 Login Request.
   * @returns {true}
   */


  onCoreLaunch(coreLaunchCallback) {
    /* istanbul ignore next */
    if (!coreLaunchCallback) throw new Error('MISSING_CALLBACK');
    (0, _classPrivateFieldSet2.default)(this, _coreLaunchCallback, coreLaunchCallback);
    return true;
  }
  /**
   * @description Sets the callback function called whenever the Consumer receives a valid LTI 1.3 Deep Linking Login Request.
   * @param {Function} deepLinkingLaunchCallback - Callback function called whenever the Consumer receives a valid LTI 1.3 Deep Linking Login Request.
   * @returns {true}
   */


  onDeepLinkingLaunch(deepLinkingLaunchCallback) {
    /* istanbul ignore next */
    if (!deepLinkingLaunchCallback) throw new Error('MISSING_CALLBACK');
    (0, _classPrivateFieldSet2.default)(this, _deepLinkingLaunchCallback, deepLinkingLaunchCallback);
    return true;
  }
  /**
   * @description Sets the callback function called whenever the Consumer receives a valid LTI 1.3 Deep Linking Response.
   * @param {Function} deepLinkingResponseCallback - Callback function called whenever the Consumer receives a valid LTI 1.3 Deep Linking Request.
   * @returns {true}
   */


  onDeepLinkingResponse(deepLinkingResponseCallback) {
    /* istanbul ignore next */
    if (!deepLinkingResponseCallback) throw new Error('MISSING_CALLBACK');
    (0, _classPrivateFieldSet2.default)(this, _deepLinkingResponseCallback, deepLinkingResponseCallback);
    return true;
  }
  /**
   * @description Sets the callback function called whenever the Consumer receives a valid LTI 1.3 Memberships Request.
   * @param {Function} membershipsRequestCallback - Callback function called whenever the Consumer receives a valid LTI 1.3 Memberships Request.
   * @returns {true}
   */


  onMembershipsRequest(membershipsRequestCallback) {
    /* istanbul ignore next */
    if (!membershipsRequestCallback) throw new Error('MISSING_CALLBACK');
    (0, _classPrivateFieldSet2.default)(this, _membershipsRequestCallback, membershipsRequestCallback);
    return true;
  }
  /**
   * @description Sets the callback function called whenever the Consumer receives a valid LTI 1.3 Line Items Request.
   * @param {Function} lineItemsRequestCallback - Callback function called whenever the Consumer receives a valid LTI 1.3 Line Items Request.
   * @returns {true}
   */


  onLineItemsRequest(lineItemsRequestCallback) {
    /* istanbul ignore next */
    if (!lineItemsRequestCallback) throw new Error('MISSING_CALLBACK');
    (0, _classPrivateFieldSet2.default)(this, _lineItemsRequestCallback, lineItemsRequestCallback);
    return true;
  }
  /**
   * @description Sets the callback function called whenever the Consumer receives a valid LTI 1.3 Line Item Request.
   * @param {Function} lineItemRequestCallback - Callback function called whenever the Consumer receives a valid LTI 1.3 Line Item Request.
   * @returns {true}
   */


  onLineItemRequest(lineItemRequestCallback) {
    /* istanbul ignore next */
    if (!lineItemRequestCallback) throw new Error('MISSING_CALLBACK');
    (0, _classPrivateFieldSet2.default)(this, _lineItemRequestCallback, lineItemRequestCallback);
    return true;
  }
  /**
   * @description Sets the callback function called whenever the Consumer receives a valid LTI 1.3 Grades Request.
   * @param {Function} gradesRequestCallback - Callback function called whenever the Consumer receives a valid LTI 1.3 Grades Request.
   * @returns {true}
   */


  onGradesRequest(gradesRequestCallback) {
    /* istanbul ignore next */
    if (!gradesRequestCallback) throw new Error('MISSING_CALLBACK');
    (0, _classPrivateFieldSet2.default)(this, _gradesRequestCallback, gradesRequestCallback);
    return true;
  }
  /**
   * @description Sets the callback function called whenever the Consumer receives an invalid LTI 1.3 Login Request.
   * @param {Function} onInvalidLoginRequestCallback - Callback function called whenever the Consumer receives an invalid LTI 1.3 Login Request.
   * @returns {true}
   */


  onInvalidLoginRequest(onInvalidLoginRequestCallback) {
    /* istanbul ignore next */
    if (!onInvalidLoginRequestCallback) throw new Error('MISSING_CALLBACK');
    (0, _classPrivateFieldSet2.default)(this, _invalidLoginRequestCallback, onInvalidLoginRequestCallback);
    return true;
  }
  /**
   * @description Sets the callback function called whenever the Consumer receives an invalid LTI 1.3 Deep Linking Response.
   * @param {Function} onInvalidLoginRequestCallback - Callback function called whenever the Consumer receives an invalid LTI 1.3 Deep Linking Response.
   * @returns {true}
   */


  onInvalidDeepLinkingResponse(onInvalidDeepLinkingResponseCallback) {
    /* istanbul ignore next */
    if (!onInvalidDeepLinkingResponseCallback) throw new Error('MISSING_CALLBACK');
    (0, _classPrivateFieldSet2.default)(this, _invalidDeepLinkingResponseCallback, onInvalidDeepLinkingResponseCallback);
    return true;
  }
  /**
   * @description Sets the callback function called whenever the Consumer receives an invalid LTI 1.3 Access Token request.
   * @param {Function} onInvalidAccessTokenRequestCallback - Callback function called whenever the Consumer receives an invalid LTI 1.3 Access Token request.
   * @returns {true}
   */


  onInvalidAccessTokenRequest(onInvalidAccessTokenRequestCallback) {
    /* istanbul ignore next */
    if (!onInvalidAccessTokenRequestCallback) throw new Error('MISSING_CALLBACK');
    (0, _classPrivateFieldSet2.default)(this, _invalidAccessTokenRequestCallback, onInvalidAccessTokenRequestCallback);
    return true;
  }
  /**
   * @description Gets the main application URL that will be used as issuer for tokens and basis for building other URLs.
   * @returns {String}
   */


  consumerUrl() {
    return (0, _classPrivateFieldGet2.default)(this, _consumerUrl);
  }
  /**
   * @description Gets the login route responsible for dealing with the OIDC login flow.
   * @returns {String}
   */


  loginRoute() {
    return (0, _classPrivateFieldGet2.default)(this, _loginRoute);
  }
  /**
   * @description Gets the access token route that will be used to generate access tokens.
   * @returns {String}
   */


  accesstokenRoute() {
    return (0, _classPrivateFieldGet2.default)(this, _accesstokenRoute);
  }
  /**
   * @description Gets the deep linking response route that will be used to handle deep linking responses.
   * @returns {String}
   */


  deepLinkingResponseRoute() {
    return (0, _classPrivateFieldGet2.default)(this, _deepLinkingResponseRoute);
  }
  /**
     * @description Gets the keyset route that will be used to retrieve a public jwk keyset.
     * @returns {String}
     */


  keysetRoute() {
    return (0, _classPrivateFieldGet2.default)(this, _keysetRoute);
  } // Tool methods

  /**
   * @description Registers a tool.
   * @param {Object} tool - Tool configuration object.
   * @param {string} tool.url - Tool url.
   * @param {string} tool.name - Tool name.
   * @param {string} tool.loginUrl - Tool login url.
   * @param {Object} tool.authConfig - Authentication configurations for the tool.
   * @param {string} [tool.redirectionURIs] - Tool redirection URIs.
   * @param {string} [tool.deepLinkingUrl] - Tool deep linking url.
   * @param {string} [tool.clientId] - Tool Client Id.
   * @param {string} [tool.description] - Tool description.
   * @param {Array<String>} [tool.scopes] - Scopes allowed for the tool.
   * @param {Number} [tool.privacy] - Privacy level.
   * @param {Object} [tool.customParameters] - Globally set custom parameters.
   * @returns {Promise<Tool>}
   */


  async registerTool(tool) {
    return Tool.registerTool(tool);
  }
  /**
   * @description Gets a registered Tool.
   * @param {String} clientId - Tool Client ID.
   * @returns {Promise<Tool | false>}
   */


  async getTool(clientId) {
    return Tool.getTool(clientId);
  }
  /**
   * @description Gets a registered Tool Link.
   * @param {String} id - Tool Link ID.
   * @returns {Promise<ToolLink | false>}
   */


  async getToolLink(id) {
    return ToolLink.getToolLink(id);
  }
  /**
   * @description Updates a tool by the Id.
   * @param {String} clientId - Tool Client ID.
   * @param {string} toolInfo.url - Tool url.
   * @param {string} toolInfo.name - Tool name.
   * @param {string} toolInfo.loginUrl - Tool login url.
   * @param {Object} toolInfo.authConfig - Authentication configurations for the tool.
   * @param {string} toolInfo.redirectionURIs - Tool redirection URIs.
   * @param {string} toolInfo.deepLinkingUrl - Tool deep linking url.
   * @param {string} toolInfo.description - Tool description.
   * @param {Array<String>} toolInfo.scopes - Scopes allowed for the tool.
   * @param {Number} toolInfo.privacy - Privacy level.
   * @param {Object} tool.customParameters - Globally set custom parameters.
   * @returns {Promise<Tool | false>}
   */


  async updateTool(clientId, toolInfo) {
    return Tool.updateTool(clientId, toolInfo);
  }
  /**
   * @description Updates a tool link by the Id.
   * @param {string} id - Tool Link ID.
   * @param {object} toolLinkInfo - Tool Link Information
   * @param {string} toolLinkInfo.url - Tool Link url.
   * @param {string} toolLinkInfo.name - Tool Link name.
   * @param {string} toolLinkInfo.description - Tool Link description.
   * @param {Number} toolLinkInfo.privacy - Privacy level.
   * @param {Object} tool.customParameters - Tool Link specific set custom parameters.
   * @returns {Promise<ToolLink | false>}
   */


  async updateToolLink(id, toolInfo) {
    return ToolLink.updateToolLink(id, toolInfo);
  }
  /**
   * @description Deletes a tool.
   * @param {String} clientId - Tool client ID.
   * @returns {Promise<true>}
   */


  async deleteTool(clientId) {
    return Tool.deleteTool(clientId);
  }
  /**
   * @description Deletes a tool link.
   * @param {string} id - Tool Link Id.
   * @returns {Promise<true>}
   */


  async deleteToolLink(id) {
    return ToolLink.deleteToolLink(id);
  }
  /**
   * @description Gets all tools.
   * @returns {Promise<Array<Tool>>}
   */


  async getAllTools() {
    return Tool.getAllTools();
  }

}

module.exports = new Consumer();