Spearmint is a application building framework for building TMSP based blockchain apps.

Heavily inspired by Restify and Express the frame work allows you to build an application through a series of routes and middleware which process incoming requests.

The short version is this:

Install:
```
var spearmint = require('spear-mint');
```

the name `spearmint` without a hyphen was taken :(

Usage:
create a new app with
```
var myApp = spearmint.createApp();
```

Add middleware preprocessors with:
```
myApp.use(function(req, res, next){
	//....
	//Do stuff modifying the req or res objects

	next() //MUST call next() at the end
})
```

Add route handlers for a message type msgtype with:
```
myApp.msgtype(function(req, res, next){
	//...
	//Do stuff

	next() //MUST CALL NEXT
})
```


valid message types include:
```
nullmessage,

echo,
flush,
info,
setoption,
exception,
appendtx,
checktx,
commit,
query,
initchain,
endblock
```

by default the app will create handlers for every message type which you can then overwrite as done above.

if you want to re-initialize the defaults (for example if you want middleware to be applied to them)
```
myApp.addDefaultHandlers();
```

note this will overwrite the handlers for those message types


start the app listening with:
```
myApp.listen(port[, hostname])
```


Example:
See the /examples folder for some examples of usage


Coming Soon:
adding routes to particular paths + path parsing


More indepth Documentation still to come.
