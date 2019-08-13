const updateNotifier = require('update-notifier')
const pkg = require('./package.json')
updateNotifier({ pkg }).notify()

exports.Provider = require('./dist/Provider/Provider')
// exports.Consumer = require("./Consumer/Consumer")
