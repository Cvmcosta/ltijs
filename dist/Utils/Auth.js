"use strict";

const crypto = require('crypto');
const Jwk = require('rasha');
const got = require('got');
const jwt = require('jsonwebtoken');
const provAuthDebug = require('debug')('provider:auth');
// const cons_authdebug = require('debug')('consumer:auth')

/**
 * @description Authentication class manages RSA keys and validation of tokens.
 */
class Auth {
  /**
     * @description Generates a new keypair for a platform.
     * @param {String} ENCRYPTIONKEY - Encryption key.
     * @returns {String} kid for the keypair.
     */
  static async generatePlatformKeyPair(ENCRYPTIONKEY, Database, platformUrl, platformClientId) {
    let kid = crypto.randomBytes(16).toString('hex');
    while (await Database.Get(false, 'publickey', {
      kid
    })) {
      /* istanbul ignore next */
      kid = crypto.randomBytes(16).toString('hex');
    }
    const keys = crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs1',
        format: 'pem'
      }
    });
    const {
      publicKey,
      privateKey
    } = keys;
    const pubkeyobj = {
      key: publicKey,
      kid
    };
    const privkeyobj = {
      key: privateKey,
      kid
    };
    await Database.Replace(ENCRYPTIONKEY, 'publickey', {
      platformUrl,
      clientId: platformClientId
    }, pubkeyobj, {
      kid,
      platformUrl,
      clientId: platformClientId
    });
    await Database.Replace(ENCRYPTIONKEY, 'privatekey', {
      platformUrl,
      clientId: platformClientId
    }, privkeyobj, {
      kid,
      platformUrl,
      clientId: platformClientId
    });
    return kid;
  }

  /**
     * @description Resolves a promisse if the token is valid following LTI 1.3 standards.
     * @param {String} token - JWT token to be verified.
     * @param {Boolean} devMode - DevMode option.
     * @param {Object} validationParameters - Stored validation parameters retrieved from database.
     * @param {Function} getPlatform - getPlatform function to get the platform that originated the token.
     * @param {String} ENCRYPTIONKEY - Encription key.
     * @returns {Promise}
     */
  static async validateToken(token, devMode, validationParameters, getPlatform, ENCRYPTIONKEY, Database) {
    const decoded = jwt.decode(token, {
      complete: true
    });
    if (!decoded) throw new Error('INVALID_JWT_RECEIVED');
    const kid = decoded.header.kid;
    validationParameters.alg = decoded.header.alg;
    provAuthDebug('Attempting to validate iss claim');
    provAuthDebug('Request Iss claim: ' + validationParameters.iss);
    provAuthDebug('Response Iss claim: ' + decoded.payload.iss);
    if (!validationParameters.iss) {
      if (!devMode) throw new Error('MISSING_VALIDATION_COOKIE');else {
        provAuthDebug('Dev Mode enabled: Missing state validation cookies will be ignored');
      }
    } else if (validationParameters.iss !== decoded.payload.iss) throw new Error('ISS_CLAIM_DOES_NOT_MATCH');
    provAuthDebug('Attempting to retrieve registered platform');
    let platform;
    if (!Array.isArray(decoded.payload.aud)) platform = await getPlatform(decoded.payload.iss, decoded.payload.aud, ENCRYPTIONKEY, Database);else {
      for (const aud of decoded.payload.aud) {
        platform = await getPlatform(decoded.payload.iss, aud, ENCRYPTIONKEY, Database);
        if (platform) break;
      }
    }
    if (!platform) throw new Error('UNREGISTERED_PLATFORM');
    const platformActive = await platform.platformActive();
    if (!platformActive) throw new Error('PLATFORM_NOT_ACTIVATED');
    const authConfig = await platform.platformAuthConfig();
    /* istanbul ignore next */
    switch (authConfig.method) {
      case 'JWK_SET':
        {
          provAuthDebug('Retrieving key from jwk_set');
          if (!kid) throw new Error('KID_NOT_FOUND');
          const keysEndpoint = authConfig.key;
          const res = await got.get(keysEndpoint).json();
          const keyset = res.keys;
          if (!keyset) throw new Error('KEYSET_NOT_FOUND');
          const jwk = keyset.find(key => {
            return key.kid === kid;
          });
          if (!jwk) throw new Error('KEY_NOT_FOUND');
          provAuthDebug('Converting JWK key to PEM key');
          const key = await Jwk.export({
            jwk
          });
          const verified = await this.verifyToken(token, key, validationParameters, platform, Database);
          return verified;
        }
      case 'JWK_KEY':
        {
          provAuthDebug('Retrieving key from jwk_key');
          if (!authConfig.key) throw new Error('KEY_NOT_FOUND');
          provAuthDebug('Converting JWK key to PEM key');
          let jwk = authConfig.key;
          if (typeof jwk === 'string') jwk = JSON.parse(jwk);
          const key = await Jwk.export({
            jwk
          });
          const verified = await this.verifyToken(token, key, validationParameters, platform, Database);
          return verified;
        }
      case 'RSA_KEY':
        {
          provAuthDebug('Retrieving key from rsa_key');
          const key = authConfig.key;
          if (!key) throw new Error('KEY_NOT_FOUND');
          const verified = await this.verifyToken(token, key, validationParameters, platform, Database);
          return verified;
        }
      default:
        {
          provAuthDebug('No auth configuration found for platform');
          throw new Error('AUTHCONFIG_NOT_FOUND');
        }
    }
  }

  /**
     * @description Verifies a token.
     * @param {Object} token - Token to be verified.
     * @param {String} key - Key to verify the token.
     * @param {Object} validationParameters - Validation Parameters.
     * @param {Platform} platform - Issuer platform.
     */
  static async verifyToken(token, key, validationParameters, platform, Database) {
    provAuthDebug('Attempting to verify JWT with the given key');
    const verified = jwt.verify(token, key, {
      algorithms: [validationParameters.alg],
      clockTimestamp: Date.now() / 1000
    });
    await this.oidcValidation(verified, platform, validationParameters, Database);
    await this.claimValidation(verified);

    // Adding clientId and platformId information to token
    verified.clientId = await platform.platformClientId();
    verified.platformId = await platform.platformKid();
    return verified;
  }

  /**
     * @description Validates de token based on the OIDC specifications.
     * @param {Object} token - Id token you wish to validate.
     * @param {Platform} platform - Platform object.
     * @param {Object} validationParameters - Validation parameters.
     */
  static async oidcValidation(token, platform, validationParameters, Database) {
    provAuthDebug('Token signature verified');
    provAuthDebug('Initiating OIDC aditional validation steps');
    const aud = this.validateAud(token, platform);
    const alg = this.validateAlg(validationParameters.alg);
    const maxAge = this.validateMaxAge(token, validationParameters.maxAge);
    const nonce = this.validateNonce(token, Database);
    return Promise.all([aud, alg, maxAge, nonce]);
  }

  /**
     * @description Validates Aud.
     * @param {Object} token - Id token you wish to validate.
     * @param {Platform} platform - Platform object.
     */
  static async validateAud(token, platform) {
    provAuthDebug("Validating if aud (Audience) claim matches the value of the tool's clientId given by the platform");
    provAuthDebug('Aud claim: ' + token.aud);
    provAuthDebug("Tool's clientId: " + (await platform.platformClientId()));
    if (Array.isArray(token.aud)) {
      provAuthDebug('More than one aud listed, searching for azp claim');
      if (token.azp && token.azp !== (await platform.platformClientId())) throw new Error('AZP_DOES_NOT_MATCH_CLIENTID');
    }
    return true;
  }

  /**
     * @description Validates Aug.
     * @param {String} alg - Algorithm used.
     */
  static async validateAlg(alg) {
    provAuthDebug('Checking alg claim. Alg: ' + alg);
    if (alg !== 'RS256') throw new Error('ALG_NOT_RS256');
    return true;
  }

  /**
     * @description Validates token max age.
     * @param {Object} token - Id token you wish to validate.
     * @param {Number} maxAge - Max age allowed for the token.
     */
  static async validateMaxAge(token, maxAge) {
    provAuthDebug('Max age parameter: ', maxAge);
    if (!maxAge) return true;
    provAuthDebug('Checking iat claim to prevent old tokens from being passed.');
    provAuthDebug('Iat claim: ' + token.iat);
    provAuthDebug('Exp claim: ' + token.exp);
    const curTime = Date.now() / 1000;
    provAuthDebug('Current_time: ' + curTime);
    const timePassed = curTime - token.iat;
    provAuthDebug('Time passed: ' + timePassed);
    if (timePassed > maxAge) throw new Error('TOKEN_TOO_OLD');
    return true;
  }

  /**
     * @description Validates Nonce.
     * @param {Object} token - Id token you wish to validate.
     */
  static async validateNonce(token, Database) {
    provAuthDebug('Validating nonce');
    provAuthDebug('Nonce: ' + token.nonce);
    if (await Database.Get(false, 'nonce', {
      nonce: token.nonce
    })) throw new Error('NONCE_ALREADY_RECEIVED');
    provAuthDebug('Storing nonce');
    await Database.Insert(false, 'nonce', {
      nonce: token.nonce
    });
    return true;
  }

  /**
   * @description Validates de token based on the LTI 1.3 core claims specifications.
   * @param {Object} token - Id token you wish to validate.
   */
  static async claimValidation(token) {
    provAuthDebug('Initiating LTI 1.3 core claims validation');
    provAuthDebug('Checking Message type claim');
    if (token['https://purl.imsglobal.org/spec/lti/claim/message_type'] !== 'LtiResourceLinkRequest' && token['https://purl.imsglobal.org/spec/lti/claim/message_type'] !== 'LtiDeepLinkingRequest') throw new Error('NO_MESSAGE_TYPE_CLAIM');
    if (token['https://purl.imsglobal.org/spec/lti/claim/message_type'] === 'LtiResourceLinkRequest') {
      provAuthDebug('Checking Target Link Uri claim');
      if (!token['https://purl.imsglobal.org/spec/lti/claim/target_link_uri']) throw new Error('NO_TARGET_LINK_URI_CLAIM');
      provAuthDebug('Checking Resource Link Id claim');
      if (!token['https://purl.imsglobal.org/spec/lti/claim/resource_link'] || !token['https://purl.imsglobal.org/spec/lti/claim/resource_link'].id) throw new Error('NO_RESOURCE_LINK_ID_CLAIM');
    }
    provAuthDebug('Checking LTI Version claim');
    if (!token['https://purl.imsglobal.org/spec/lti/claim/version']) throw new Error('NO_LTI_VERSION_CLAIM');
    if (token['https://purl.imsglobal.org/spec/lti/claim/version'] !== '1.3.0') throw new Error('WRONG_LTI_VERSION_CLAIM');
    provAuthDebug('Checking Deployment Id claim');
    if (!token['https://purl.imsglobal.org/spec/lti/claim/deployment_id']) throw new Error('NO_DEPLOYMENT_ID_CLAIM');
    provAuthDebug('Checking Sub claim');
    if (!token.sub) throw new Error('NO_SUB_CLAIM');
    provAuthDebug('Checking Roles claim');
    if (!token['https://purl.imsglobal.org/spec/lti/claim/roles']) throw new Error('NO_ROLES_CLAIM');
  }

  /**
     * @description Gets a new access token from the platform.
     * @param {String} scopes - Request scopes
     * @param {Platform} platform - Platform object of the platform you want to access.
     */
  static async getAccessToken(scopes, platform, ENCRYPTIONKEY, Database) {
    const platformUrl = await platform.platformUrl();
    const clientId = await platform.platformClientId();
    const confjwt = {
      sub: clientId,
      iss: clientId,
      aud: await platform.platformAuthorizationServer(),
      jti: encodeURIComponent([...Array(25)].map(_ => (Math.random() * 36 | 0).toString(36)).join``)
    };
    const token = jwt.sign(confjwt, await platform.platformPrivateKey(), {
      algorithm: 'RS256',
      expiresIn: 60,
      keyid: await platform.platformKid()
    });
    const message = {
      grant_type: 'client_credentials',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      client_assertion: token,
      scope: scopes
    };
    provAuthDebug('Awaiting return from the platform');
    const access = await got.post(await platform.platformAccessTokenEndpoint(), {
      form: message
    }).json();
    provAuthDebug('Successfully generated new access_token');
    await Database.Replace(ENCRYPTIONKEY, 'accesstoken', {
      platformUrl,
      clientId,
      scopes
    }, {
      token: access
    }, {
      platformUrl,
      clientId,
      scopes
    });
    return access;
  }
}
module.exports = Auth;