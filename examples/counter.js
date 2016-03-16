var app = require("../lib/index");
var util = require('util');
var types = app.types;

//We are going to create a dummy app

counterApp = app.createApp()

var hashCount = 0;
var txCount = 0;
var serial = false;

//This is a simple "middleware" example which is going to get attached to all route

counterApp.use(function(req, res, next){
	console.log("\n\n================================================")
	console.log("A new Request has come in! Its method is: " + req.method)
	next()

})

//Re-add the defaults so that the middle ware gets used on them
counterApp.addDefaultHandlers();

counterApp.info(function(req, res, next){
	res.send({data: util.format("hashes:%d, txs:%d", hashCount, txCount)})
})

counterApp.setoption(function(req, res, next){
	if (req.key == 'serial'){
		if (req.value == 'on'){
			serial = true;
			res.send({log: "ok"})
		} else if (req.value == 'off'){
			serial = false;
			res.send({log: "ok"})
		} else {
			res.send({log: "Unexpected value"})
		}
	} else {
		res.send({log: "Unexpected key"})
	}
	next()
})

counterApp.appendtx(function(req, res, next){
	if (serial) {
		var txBytes = req.data;
		if (txBytes.length >= 2 && txBytes.slice(0, 2) == "0x") {
			var hexString = txBytes.toString("ascii", 2);
			var hexBytes = new Buffer(hexString, "hex");
			txBytes = hexBytes;
		}	
		var txValue = txBytes.readUIntBE(0, txBytes.length);
		if (txValue != txCount){
			res.send({code:types.CodeType.BadNonce, log:"Nonce is invalid. Got "+txValue+", expected "+txCount});
		}
	}
	txCount += 1;
	res.send({code:types.CodeType_OK});
})

counterApp.checktx(function(req, res, next){
	if (serial) {
		var txBytes = req.data;
		if (txBytes.length >= 2 && txBytes.slice(0, 2) == "0x") {
			var hexString = txBytes.toString("ascii", 2);
			var hexBytes = new Buffer(hexString, "hex");
			txBytes = hexBytes;
		}	
		var txValue = txBytes.readUIntBE(0, txBytes.length);
		if (txValue < txCount){
			res.send({code:types.CodeType.BadNonce, log:"Nonce is too low. Got "+txValue+", expected >= "+txCount});
		}
	}
	res.send({code:types.CodeType_OK});
})

counterApp.commit(function(req, res, next){
	hashCount += 1;
	if (txCount == 0){
		res.send({log:"Zero tx count; hash is empth"});
	}
	var buf = new Buffer(8);
	buf.writeIntBE(txCount, 0, 8);
	res.send({data:buf});
})

//Notice I didn't add in query. This will still work because of the default handlers


console.log("Counter app running on port 46658")

counterApp.listen(46658)