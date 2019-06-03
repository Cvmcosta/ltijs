//Express server
const express = require('express')
var bodyParser = require("body-parser");

class Server{

    constructor(){
        this.app = express()
        this.app.use(bodyParser.urlencoded({ extended: false }));
        this.app.use(bodyParser.json());
    }
}

module.exports = Server