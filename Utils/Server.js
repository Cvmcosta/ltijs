//Express server
const express = require('express')
const bodyParser = require("body-parser");
const path = require("path")
const https = require('https');


class Server{

    constructor(ssl){

        this.httpsServer
        this.app = express()
        this.ssl = ssl
        

        this.app.use(bodyParser.urlencoded({ extended: false }));
        this.app.use(bodyParser.json());
        
        //mudar endereço estatico
        var appDir = path.dirname(require.main.filename);
        this.app.use(express.static(appDir+'/views/teste')) 
    }

    listen(port, message){
        this.httpsServer = https.createServer(this.ssl, this.app).listen(port, () => console.log(message))
    }
}

module.exports = Server