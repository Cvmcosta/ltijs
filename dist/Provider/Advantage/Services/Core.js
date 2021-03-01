"use strict";

// Dependencies
const crypto = require('crypto');

const jwt = require('jsonwebtoken');

const url = require('fast-url-parser');

const provLoginDebug = require('debug')('provider:login');

const provLaunchDebug = require('debug')('provider:launch');

const provAccessDebug = require('debug')('provider:access'); // Classes


const Database = require('../../../GlobalUtils/Database');

const Platform = require('../Classes/Platform');

const Auth = require('../Classes/Auth');
/**
 * @description LTI 1.3 Core service methods.
 */


class Core {
  /**
   * @description LTI 1.3 Login handler
   */
  static async login(platform, params) {
    provLoginDebug('Redirecting to platform authentication endpoint'); // Create state parameter used to validade authentication response

    let state = encodeURIComponent(crypto.randomBytes(25).toString('hex'));
    provLoginDebug('Target Link URI: ', params.target_link_uri);
    /* istanbul ignore next */
    // Cleaning up target link uri and retrieving query parameters

    if (params.target_link_uri.includes('?')) {
      // Retrieve raw queries
      const rawQueries = new URLSearchParams('?' + params.target_link_uri.split('?')[1]); // Check if state is unique

      while (await Database.get('state', {
        state: state
      })) state = encodeURIComponent(crypto.randomBytes(25).toString('hex'));

      provLoginDebug('Generated state: ', state); // Assemble queries object

      const queries = {};

      for (const [key, value] of rawQueries) {
        queries[key] = value;
      }

      params.target_link_uri = params.target_link_uri.split('?')[0];
      provLoginDebug('Query parameters found: ', queries);
      provLoginDebug('Final Redirect URI: ', params.target_link_uri); // Store state and query parameters on database

      await Database.insert('state', {
        state: state,
        query: queries
      });
    } // Build authentication request


    const query = {
      response_type: 'id_token',
      response_mode: 'form_post',
      id_token_signed_response_alg: 'RS256',
      scope: 'openid',
      client_id: params.client_id || (await platform.platformClientId()),
      redirect_uri: params.target_link_uri,
      login_hint: params.login_hint,
      nonce: encodeURIComponent([...Array(25)].map(_ => (Math.random() * 36 | 0).toString(36)).join``),
      prompt: 'none',
      state: state
    };
    if (params.lti_message_hint) query.lti_message_hint = params.lti_message_hint;
    if (params.lti_deployment_id) query.lti_deployment_id = params.lti_deployment_id;
    provLoginDebug('Login request: ');
    provLoginDebug(query);
    return {
      target: url.format({
        pathname: await platform.platformAuthenticationEndpoint(),
        query: query
      }),
      state: state
    };
  }
  /**
   * @description LTI 1.3 Launch handler
   */


  static async launch(idtoken, validationParameters) {
    const decoded = jwt.decode(idtoken, {
      complete: true
    });
    if (!decoded) throw new Error('INVALID_JWT_RECEIVED');
    validationParameters.iss = decoded.payload.iss;
    validationParameters.aud = decoded.payload.aud;
    validationParameters.kid = decoded.header.kid;
    validationParameters.alg = decoded.header.alg;
    provLaunchDebug('Validating iss claim');
    provLaunchDebug('Request Iss claim: ' + validationParameters.stateValue);
    provLaunchDebug('Response Iss claim: ' + validationParameters.iss);

    if (!validationParameters.stateValue) {
      if (!validationParameters.devMode) throw new Error('MISSING_VALIDATION_COOKIE');else {
        provLaunchDebug('Dev Mode enabled: Missing state validation cookies will be ignored');
      }
    } else if (validationParameters.stateValue !== validationParameters.iss) throw new Error('ISS_CLAIM_DOES_NOT_MATCH');

    provLaunchDebug('Retrieving registered platform');
    let platform;
    if (!Array.isArray(decoded.payload.aud)) platform = await Platform.getPlatform(validationParameters.iss, validationParameters.aud);else {
      for (const aud of validationParameters.aud) {
        platform = await Platform.getPlatform(validationParameters.iss, aud);
        if (platform) break;
      }
    }
    if (!platform) throw new Error('UNREGISTERED_PLATFORM');
    const platformActive = await platform.platformActive();
    if (!platformActive) throw new Error('PLATFORM_NOT_ACTIVATED');
    const valid = await Auth.validateToken(idtoken, platform, validationParameters);
    provLaunchDebug('Successfully validated token!');
    const courseId = valid['https://purl.imsglobal.org/spec/lti/claim/context'] ? valid['https://purl.imsglobal.org/spec/lti/claim/context'].id : 'NF';
    const resourceId = valid['https://purl.imsglobal.org/spec/lti/claim/resource_link'] ? valid['https://purl.imsglobal.org/spec/lti/claim/resource_link'].id : 'NF';
    const clientId = valid.clientId;
    const deploymentId = valid['https://purl.imsglobal.org/spec/lti/claim/deployment_id'];
    const contextId = encodeURIComponent(valid.iss + clientId + deploymentId + courseId + '_' + resourceId);
    const platformCode = encodeURIComponent('lti' + Buffer.from(valid.iss + clientId + deploymentId).toString('base64')); // Mount platform token

    const platformToken = {
      iss: valid.iss,
      user: valid.sub,
      userInfo: {
        given_name: valid.given_name,
        family_name: valid.family_name,
        name: valid.name,
        email: valid.email
      },
      platformInfo: valid['https://purl.imsglobal.org/spec/lti/claim/tool_platform'],
      clientId: valid.clientId,
      platformId: valid.platformId,
      deploymentId: valid['https://purl.imsglobal.org/spec/lti/claim/deployment_id']
    }; // Store idToken in database

    await Database.replace('idtoken', {
      iss: valid.iss,
      clientId: clientId,
      deploymentId: deploymentId,
      user: valid.sub
    }, platformToken); // Mount context token

    const contextToken = {
      contextId: contextId,
      path: validationParameters.path,
      user: valid.sub,
      roles: valid['https://purl.imsglobal.org/spec/lti/claim/roles'],
      targetLinkUri: valid['https://purl.imsglobal.org/spec/lti/claim/target_link_uri'],
      context: valid['https://purl.imsglobal.org/spec/lti/claim/context'],
      resource: valid['https://purl.imsglobal.org/spec/lti/claim/resource_link'],
      custom: valid['https://purl.imsglobal.org/spec/lti/claim/custom'],
      launchPresentation: valid['https://purl.imsglobal.org/spec/lti/claim/launch_presentation'],
      messageType: valid['https://purl.imsglobal.org/spec/lti/claim/message_type'],
      version: valid['https://purl.imsglobal.org/spec/lti/claim/version'],
      deepLinkingSettings: valid['https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings'],
      lis: valid['https://purl.imsglobal.org/spec/lti/claim/lis'],
      endpoint: valid['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'],
      namesRoles: valid['https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice']
    }; // Store contextToken in database

    await Database.replace('contexttoken', {
      contextId: contextId,
      user: valid.sub
    }, contextToken);
    provLaunchDebug('Generating ltik');
    const ltikObj = {
      platformUrl: valid.iss,
      clientId: clientId,
      deploymentId: deploymentId,
      platformCode: platformCode,
      contextId: contextId,
      user: valid.sub,
      s: validationParameters.state // Added state to make unique ltiks

    }; // Signing context token

    const ltik = jwt.sign(ltikObj, validationParameters.encryptionkey);
    return {
      token: platformToken,
      context: contextToken,
      ltik: ltik
    };
  }
  /**
   * @description LTI 1.3 Access handler
   */


  static async access(ltik, validationParameters) {
    const validLtik = jwt.verify(ltik, validationParameters.encryptionkey);
    provAccessDebug('Ltik successfully verified');
    const platformUrl = validLtik.platformUrl;
    const platformCode = validLtik.platformCode;
    const clientId = validLtik.clientId;
    const deploymentId = validLtik.deploymentId;
    const contextId = validLtik.contextId;
    provAccessDebug('Retrieving user session');
    let user = validLtik.user;

    if (!validationParameters.ltiaas) {
      provAccessDebug('Attempting to retrieve matching session cookie');
      const cookieUser = validationParameters.cookies[platformCode];

      if (!cookieUser) {
        if (!validationParameters.devMode) user = false;else {
          provAccessDebug('Dev Mode enabled: Missing session cookies will be ignored');
        }
      } else if (user.toString() !== cookieUser.toString()) user = false;
    }

    if (!user) throw new Error('SESSION_NOT_FOUND');
    provAccessDebug('Valid session found');
    provAccessDebug('Building ID Token'); // Gets corresponding id token from database

    const idTokenObject = await Database.get('idtoken', {
      iss: platformUrl,
      clientId: clientId,
      deploymentId: deploymentId,
      user: user
    });
    if (!idTokenObject) throw new Error('IDTOKEN_NOT_FOUND_DB');
    const idToken = JSON.parse(JSON.stringify(idTokenObject[0])); // Gets correspondent context token from database

    const contextTokenObject = await Database.get('contexttoken', {
      contextId: contextId,
      user: user
    });
    if (!contextTokenObject) throw new Error('CONTEXTTOKEN_NOT_FOUND_DB');
    idToken.platformContext = JSON.parse(JSON.stringify(contextTokenObject[0]));
    return idToken;
  }

}

module.exports = Core;