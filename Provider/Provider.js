/* Main file for the Provider functionalities */

// Express server to receive the requests
const Server = require('./Server')

/** Exposes methods for easy manipualtion of the LTI standard as a LTI Provider */
class Provider{
    constructor(){
        this.app = null
        this.server = new Server()
    }

    /**
     * @description Starts listening to a given port for LTI requests
     * @param {number} port - The port the Provider should listen to
     */
    listen(port){
        port = port || 3000
        this.server.app.get('/', (req, res)=>{
            res.send("teste")
        })
        this.server.init(port)
    }
}
module.exports = Provider