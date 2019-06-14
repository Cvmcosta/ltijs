pem.createCertificate({ days: 3600, selfSigned: true }, function (err, keys) {
            if(err) console.log(err)
          
            let publicKey, privateKey

            publicKey = keys.certificate
            privateKey = keys.serviceKey

            

            let jwk_publicKey = jwk.pem2jwk(publicKey)
            let jwk_privateKey = jwk.pem2jwk(privateKey)
            jwk_publicKey.kid = kid
            jwk_publicKey.use = "sig"
            

            
            jwk_privateKey.kid = kid
            jwk_privateKey.use = "sig"
            
            Database.Insert(false, './provider_data', 'publickeyset', 'keys',jwk_publicKey)
            Database.Insert(false, './provider_data', 'privatekeyset', 'keys',jwk_privateKey)
    
            
            return kid
        })
        