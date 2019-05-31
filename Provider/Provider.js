/* Main file for the Provider functionalities */

// Express server to receive the requests
const Server = require('./Server')

/** Exposes methods for easy manipualtion of the LTI standard as a LTI Provider */
class Provider{
    constructor(){
        this.server = new Server()
    }

    /**
     * @description Starts listening to a given port for LTI requests
     * @param {number} port - The port the Provider should listen to
     */
    listen(port){
        port = port || 3000
        this.server.app.all('/', (req, res, next)=>{

            next()
        })
        this.server.app.post('/', (req, res)=>{
            console.log("post>>")
            console.log(req.body)
            res.sendStatus(200)
           
        })
        this.server.app.get('/', (req, res)=>{
            console.log("get>>")
            console.log(req.body)
            res.send("get")
            
        })
       
        this.server.init(port)
    }
}
module.exports = Provider