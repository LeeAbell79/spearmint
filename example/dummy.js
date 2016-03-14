var tmsp = require("../index")

//We are going to create a dummy app

dummyApp = tmsp.createApp()

dummyApp.listen(46658)
console.log("Dummy app running on port 46658")