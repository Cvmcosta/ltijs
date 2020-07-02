"use strict";

/* eslint-disable require-atomic-updates */

/* eslint-disable no-useless-escape */

/* Main class for the Consumer functionalities */
const Server = require('../Utils/Server');

const Request = require('../Utils/Request');

const Auth = require('../Utils/Auth');

const Tool = require('//Utils/Tool');

const Database = require('../Utils/Database');

const url = require('url');

const validator = require('validator');

const mongoose = require('mongoose');

mongoose.set('useCreateIndex', true);
const Schema = mongoose.Schema;

const provAuthDebug = require('debug')('consumer:auth');

const provMainDebug = require('debug')('consumer:main');
/**
 * @descripttion Exposes methods for easy manipualtion of the LTI 1.3 standard as a LTI Consumer and a "server" object to manipulate the Express instance
 */


var _ENCRYPTIONKEY = new WeakMap();

var _dbConnection = new WeakMap();

class Consumer {
  /**
   * @description Exposes methods for easy manipualtion of the LTI 1.3 standard as a LTI Provider and a "server" object to manipulate the Express instance.
   * @param {String} encryptionkey - Secret used to sign cookies and encrypt other info.
   * @param {Object} database - The Database configurations to open and manage connection, uses MongoDB Driver.
   * @param {String} database.url - Database Url (Ex: mongodb://localhost/applicationdb).
   * @param {Object} [database.connection] - Database connection options (Ex: user, pass)
   * @param {String} [database.connection.user] - Database user for authentication if needed.
   * @param {String} [database.conenction.pass] - Database pass for authentication if needed.
   * @param {Object} [options] - Lti Provider additional options,.
   * @param {String} [options.appUrl = '/'] - Lti Provider main url. If no option is set '/' is used.
   * @param {String} [options.loginUrl = '/login'] - Lti Provider login url. If no option is set '/login' is used.
   * @param {String} [options.sessionTimeoutUrl = '/sessionTimeout'] - Lti Provider session timeout url. If no option is set '/sessionTimeout' is used.
   * @param {String} [options.invalidTokenUrl = '/invalidToken'] - Lti Provider invalid token url. If no option is set '/invalidToken' is used.
   * @param {Boolean} [options.https = false] - Set this as true in development if you are not using any web server to redirect to your tool (like Nginx) as https. If you set this option as true you can enable the secure flag in the cookies options of the onConnect method.
   * @param {Object} [options.ssl] - SSL certificate and key if https is enabled.
   * @param {String} [options.ssl.key] - SSL key.
   * @param {String} [options.ssl.cert] - SSL certificate.
   * @param {String} [options.staticPath] - The path for the static files your application might serve (Ex: _dirname+"/public")
    */
  constructor(encryptionkey, database, options) {
    _ENCRYPTIONKEY.set(this, {
      writable: true,
      value: void 0
    });

    _dbConnection.set(this, {
      writable: true,
      value: {}
    });

    if (!encryptionkey) throw new Error('Encryptionkey parameter missing in options.');
    if (!database || !database.url) throw new Error('Missing database configurations.');
  }

}