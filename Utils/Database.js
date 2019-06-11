const low = require('lowdb')
const FileSync = require('lowdb/adapters/FileSync')
const Cryptr = require('cryptr')
const fs = require('fs')


/**
 * @description Set of static classes to manipulate the database
 */
class Database{

    /**
     * @description Get item or entire database.
     * @param {string} ENCRYPTIONKEY - Encryptionkey of the database, false if none
     * @param {String} path - Path of database to be accessed.
     * @param {String} database - Database name.
     * @param {string} set - The set to be accessed inside the database.
     * @param {object} [query] - Query for the item you are looking for in the format {type: "type1"}.
     */
    static Get(ENCRYPTIONKEY, path, database, set, query){
        let cryptr
        let adapter
        let db
        let result

        if(!path || !database|| !set){
            console.error("Missing arguments Path or/and Set.")
            return false
        }

        if(!fs.existsSync(path)) fs.mkdirSync(path)

        if(ENCRYPTIONKEY){
            cryptr = new Cryptr(ENCRYPTIONKEY)
            adapter = new FileSync(path+'/'+database+'.json', {
                serialize: (data) => cryptr.encrypt(JSON.stringify(data)),
                deserialize: (data) => JSON.parse(cryptr.decrypt(data))
              })   
        }else{
            adapter = new FileSync(path+'/'+database+'.json')  
        }
        db = low(adapter)


        if(!db.get(set).value()) return false
        if(query){
            result = db.get(set).find(query).value()
        }   else{
            result = db.get(set).value()
        }
        if(result) return result
        return false

    }



    /**
     * @description Insert item in database.
     * @param {string} ENCRYPTIONKEY - Encryptionkey of the database, false if none.
     * @param {string} path - Path of database to be accessed.
     * @param {string} database - Database name.
     * @param {string} set - The set to be accessed inside the database.
     * @param {object} item - The item object you want to insert in the database.
     */
    static Insert(ENCRYPTIONKEY, path, database, set, item){
        let cryptr
        let adapter
        let db
        let result

        if(!path || !database || !set || !item){
            console.error("Missing argument.")
            return false
        }

        if(!fs.existsSync(path)) fs.mkdirSync(path)

        if(ENCRYPTIONKEY){
            cryptr = new Cryptr(ENCRYPTIONKEY)
            adapter = new FileSync(path+'/'+database+'.json', {
                serialize: (data) => cryptr.encrypt(JSON.stringify(data)),
                deserialize: (data) => JSON.parse(cryptr.decrypt(data))
              })   
        }else{
            adapter = new FileSync(path+'/'+database+'.json')  
        }
        db = low(adapter)


        db.defaults({[set]: []}).write()
        db.get(set).push(item).write()
         
        return true

    }


    /**
     * @description Assign value to item in database
     * @param {string} ENCRYPTIONKEY - Encryptionkey of the database, false if none.
     * @param {string} path - Path of database to be accessed.
     * @param {string} database - Database name.
     * @param {string} set - The set to be accessed inside the database.
     * @param {object} query - The entry you want to modify in the format {type: "type1"}.
     * @param {object} modification - The modification you want to make in the format {type: "type2"}.
     */
    static Modify(ENCRYPTIONKEY, path, database, set, query, modification){
        let cryptr
        let adapter
        let db
        let result

        if(!path || !database || !set || !query || !modification){
            console.error("Missing argument.")
            return false
        }

        if(!fs.existsSync(path)) fs.mkdirSync(path)

        if(ENCRYPTIONKEY){
            cryptr = new Cryptr(ENCRYPTIONKEY)
            adapter = new FileSync(path+'/'+database+'.json', {
                serialize: (data) => cryptr.encrypt(JSON.stringify(data)),
                deserialize: (data) => JSON.parse(cryptr.decrypt(data))
              })   
        }else{
            adapter = new FileSync(path+'/'+database+'.json')  
        }
        db = low(adapter)


        if(!db.get(set).value()) return false
        db.get(set).find(query).assign(modification).write()
         
        return true

    }

    /**
     * @description Delete item in database
     * @param {string} ENCRYPTIONKEY - Encryptionkey of the database, false if none.
     * @param {string} path - Path of database to be accessed.
     * @param {string} database - Database name.
     * @param {string} set - The set to be accessed inside the database.
     * @param {object} query - The entry you want to delete in the format {type: "type1"}.
     */
    static Delete(ENCRYPTIONKEY, path, database, set, query){
        let cryptr
        let adapter
        let db
        let result

        if(!path || !database || !set || !query){
            console.error("Missing argument.")
            return false
        }

        if(!fs.existsSync(path)) fs.mkdirSync(path)

        if(ENCRYPTIONKEY){
            cryptr = new Cryptr(ENCRYPTIONKEY)
            adapter = new FileSync(path+'/'+database+'.json', {
                serialize: (data) => cryptr.encrypt(JSON.stringify(data)),
                deserialize: (data) => JSON.parse(cryptr.decrypt(data))
              })   
        }else{
            adapter = new FileSync(path+'/'+database+'.json')  
        }
        db = low(adapter)


        if(!db.get(set).value()) return false
        db.get(set)
            .remove(query)
            .write()
         
        return true

    }


    



}

module.exports = Database