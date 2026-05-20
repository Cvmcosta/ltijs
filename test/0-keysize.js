// Unit tests for the configurable keySize option on Auth.generatePlatformKeyPair.
// These exercise the static method directly with an in-memory Database stub so
// the assertions don't depend on the Provider singleton's setup/deploy lifecycle.

const chai = require('chai')
const chaiAsPromised = require('chai-as-promised')
const crypto = require('crypto')
chai.use(chaiAsPromised)
const expect = chai.expect

const Auth = require('../dist/Utils/Auth')

// Minimal in-memory Database stand-in. Auth.generatePlatformKeyPair only uses
// Database.Get (kid uniqueness check) and Database.Replace (key persistence).
// Pass ENCRYPTIONKEY=false to skip encryption so the stored docs match the
// pubkeyobj/privkeyobj shape directly.
function makeStubDatabase () {
  const store = { publickey: [], privatekey: [] }
  return {
    async Get (_ENCRYPTIONKEY, collection, query) {
      const match = store[collection].find(d =>
        Object.entries(query).every(([k, v]) => d[k] === v)
      )
      return match ? [match] : false
    },
    async Replace (_ENCRYPTIONKEY, collection, _query, item) {
      store[collection].push(item)
      return true
    },
    _store: store
  }
}

function modulusLengthOf (pem) {
  return crypto.createPublicKey(pem).asymmetricKeyDetails.modulusLength
}

describe('Testing Auth.generatePlatformKeyPair keySize option', function () {
  this.timeout(20000)

  it('default (no keySize) produces a 4096-bit RSA modulus', async () => {
    const db = makeStubDatabase()
    const kid = await Auth.generatePlatformKeyPair(false, db, 'https://platform.example.com', 'cid-default')
    const pub = db._store.publickey.find(d => d.kid === kid)
    expect(pub).to.exist
    expect(modulusLengthOf(pub.key)).to.equal(4096)
  })

  it('keySize: 2048 produces a 2048-bit RSA modulus', async () => {
    const db = makeStubDatabase()
    const kid = await Auth.generatePlatformKeyPair(false, db, 'https://platform.example.com', 'cid-2048', 2048)
    const pub = db._store.publickey.find(d => d.kid === kid)
    expect(pub).to.exist
    expect(modulusLengthOf(pub.key)).to.equal(2048)
  })
})
