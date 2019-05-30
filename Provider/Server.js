//Express server
const express = require('express')

class Server{
    constructor(){
        this.app = express()
    }


    /**
     * @description Starts listening to a given port for LTI requests
     * @param {number} port - The port the server should listen to
     */
    init(port){
        this.app.listen(port, () => console.log(`Example app listening on port ${port}!`))
    }


}

module.exports = Server