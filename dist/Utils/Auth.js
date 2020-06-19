"use strict";

const crypto = require('crypto');

const Jwk = require('rasha');

const got = require('got');

const jwt = require('jsonwebtoken');

const provAuthDebug = require('debug')('provider:auth'); // const cons_authdebug = require('debug')('consumer:auth')

/**
 * @description Authentication class manages RSA keys and validation of tokens.
 */


class Auth {
  /**
     * @description Generates a new keypairfor the platform.
     * @param {String} ENCRYPTIONKEY - Encryption key.
     * @returns {String} kid for the keypair.
     */
  static async generateProviderKeyPair(ENCRYPTIONKEY, Database) {
    let kid = crypto.randomBytes(16).toString('hex');

    while (await Database.Get(false, 'publickey', {
      kid: kid
    })) {
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
      kid: kid
    };
    const privkeyobj = {
      key: privateKey,
      kid: kid
    };
    await Database.Insert(ENCRYPTIONKEY, 'publickey', pubkeyobj, {
      kid: kid
    });
    await Database.Insert(ENCRYPTIONKEY, 'privatekey', privkeyobj, {
      kid: kid
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
    if (!decoded) throw new Error('Invalid JWT received');
    const kid = decoded.header.kid;
    const alg = decoded.header.alg;
    provAuthDebug('Attempting to validate iss claim');
    provAuthDebug('Request Iss claim: ' + validationParameters.iss);
    provAuthDebug('Response Iss claim: ' + decoded.payload.iss);

    if (!validationParameters.iss) {
      if (!devMode) throw new Error('IssClaimDoesNotMatch');else {
        provAuthDebug('Dev Mode enabled: Missing state validation cookies will be ignored');
      }
    } else if (validationParameters.iss !== decoded.payload.iss) throw new Error('IssClaimDoesNotMatch');

    provAuthDebug('Attempting to retrieve registered platform');
    const platform = await getPlatform(decoded.payload.iss, ENCRYPTIONKEY, Database);
    if (!platform) throw new Error('NoPlatformRegistered');
    const authConfig = await platform.platformAuthConfig();

    switch (authConfig.method) {
      case 'JWK_SET':
        {
          provAuthDebug('Retrieving key from jwk_set');
          if (!kid) throw new Error('NoKidFoundInToken');
          const keysEndpoint = authConfig.key;
          const res = await got.get(keysEndpoint).json();
          const keyset = res.keys;
          if (!keyset) throw new Error('NoKeySetFound');
          const jwk = keyset.find(key => {
            return key.kid === kid;
          });
          if (!jwk) throw new Error('NoKeyFound');
          provAuthDebug('Converting JWK key to PEM key');
          const key = await Jwk.export({
            jwk: jwk
          });
          const verified = await this.verifyToken(token, key, alg, platform, Database);
          return verified;
        }

      case 'JWK_KEY':
        {
          provAuthDebug('Retrieving key from jwk_key');
          if (!authConfig.key) throw new Error('NoKeyFound');
          const key = Jwk.jwk2pem(authConfig.key);
          const verified = await this.verifyToken(token, key, alg, platform, Database);
          return verified;
        }

      case 'RSA_KEY':
        {
          provAuthDebug('Retrieving key from rsa_key');
          const key = authConfig.key;
          if (!key) throw new Error('NoKeyFound');
          const verified = await this.verifyToken(token, key, alg, platform, Database);
          return verified;
        }

      default:
        {
          provAuthDebug('No auth configuration found for platform');
          throw new Error('NoAuthConfigFound');
        }
    }
  }
  /**
     * @description Verifies a token.
     * @param {Object} token - Token to be verified.
     * @param {String} key - Key to verify the token.
     * @param {String} alg - Algorithm used.
     * @param {Platform} platform - Issuer platform.
     */


  static async verifyToken(token, key, alg, platform, Database) {
    provAuthDebug('Attempting to verify JWT with the given key');
    const verified = jwt.verify(token, key, {
      algorithms: [alg]
    });
    await this.oidcValidation(verified, platform, alg, Database);
    await this.claimValidation(verified);
    return verified;
  }
  /**
     * @description Validates de token based on the OIDC specifications.
     * @param {Object} token - Id token you wish to validate.
     * @param {Platform} platform - Platform object.
     * @param {String} alg - Algorithm used.
     */


  static async oidcValidation(token, platform, alg, Database) {
    provAuthDebug('Token signature verified');
    provAuthDebug('Initiating OIDC aditional validation steps');
    const aud = this.validateAud(token, platform);

    const _alg = this.validateAlg(alg);

    const iat = this.validateIat(token);
    const nonce = this.validateNonce(token, Database);
    return Promise.all([aud, _alg, iat, nonce]);
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
    if (!token.aud.includes(await platform.platformClientId())) throw new Error('AudDoesNotMatchClientId');

    if (Array.isArray(token.aud)) {
      provAuthDebug('More than one aud listed, searching for azp claim');
      if (token.azp && token.azp !== (await platform.platformClientId())) throw new Error('AzpClaimDoesNotMatchClientId');
    }

    return true;
  }
  /**
     * @description Validates Aug.
     * @param {String} alg - Algorithm used.
     */


  static async validateAlg(alg) {
    provAuthDebug('Checking alg claim. Alg: ' + alg);
    if (alg !== 'RS256') throw new Error('NoRSA256Alg');
    return true;
  }
  /**
     * @description Validates Iat.
     * @param {Object} token - Id token you wish to validate.
     */


  static async validateIat(token) {
    provAuthDebug('Checking iat claim to prevent old tokens from being passed.');
    provAuthDebug('Iat claim: ' + token.iat);
    provAuthDebug('Exp claim: ' + token.exp);
    const curTime = Date.now() / 1000;
    provAuthDebug('Current_time: ' + curTime);
    const timePassed = curTime - token.iat;
    provAuthDebug('Time passed: ' + timePassed);
    if (timePassed > 10) throw new Error('TokenTooOld');
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
    })) throw new Error('NonceAlreadyStored');
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
    if (token['https://purl.imsglobal.org/spec/lti/claim/message_type'] !== 'LtiResourceLinkRequest' && token['https://purl.imsglobal.org/spec/lti/claim/message_type'] !== 'LtiDeepLinkingRequest') throw new Error('NoMessageTypeClaim');

    if (token['https://purl.imsglobal.org/spec/lti/claim/message_type'] === 'LtiResourceLinkRequest') {
      provAuthDebug('Checking Target Link Uri claim');
      if (!token['https://purl.imsglobal.org/spec/lti/claim/target_link_uri']) throw new Error('NoTargetLinkUriClaim');
      provAuthDebug('Checking Resource Link Id claim');
      if (!token['https://purl.imsglobal.org/spec/lti/claim/resource_link'] || !token['https://purl.imsglobal.org/spec/lti/claim/resource_link'].id) throw new Error('NoResourceLinkIdClaim');
    }

    provAuthDebug('Checking LTI Version claim');
    if (!token['https://purl.imsglobal.org/spec/lti/claim/version']) throw new Error('NoLTIVersionClaim');
    if (token['https://purl.imsglobal.org/spec/lti/claim/version'] !== '1.3.0') throw new Error('WrongLTIVersionClaim');
    provAuthDebug('Checking Deployment Id claim');
    if (!token['https://purl.imsglobal.org/spec/lti/claim/deployment_id']) throw new Error('NoDeploymentIdClaim');
    provAuthDebug('Checking Sub claim');
    if (!token.sub) throw new Error('NoSubClaim');
    provAuthDebug('Checking Roles claim');
    if (!token['https://purl.imsglobal.org/spec/lti/claim/roles']) throw new Error('NoRolesClaim');
  }
  /**
     * @description Gets a new access token from the platform.
     * @param {String} scopes - Request scopes
     * @param {Platform} platform - Platform object of the platform you want to access.
     */


  static async getAccessToken(scopes, platform, ENCRYPTIONKEY, Database) {
    const confjwt = {
      iss: await platform.platformClientId(),
      sub: await platform.platformClientId(),
      aud: await platform.platformAccessTokenEndpoint(),
      iat: Date.now() / 1000,
      exp: Date.now() / 1000 + 60,
      jti: crypto.randomBytes(16).toString('base64')
    };
    const token = jwt.sign(confjwt, await platform.platformPrivateKey(), {
      algorithm: 'RS256',
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
    await Database.Insert(ENCRYPTIONKEY, 'accesstoken', {
      token: access
    }, {
      platformUrl: await platform.platformUrl(),
      scopes: scopes
    });
    return access;
  }

}

module.exports = Auth;