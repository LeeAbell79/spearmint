'use strict';

var domain = require('domain');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var assert = require('assert-plus');
var once = require('once');

var shallowCopy = require('./utils').shallowCopy;

var net = require("net");
var types = require("./types");
var Response = require("./response");
var server = require("./server");
var Router = require("./router");

/**
 * helper function to help verify and flatten an array of arrays.
 * takes an arguments object and an index frmo which to slice, then
 * merges that into a single array.
 * @private
 * @function argumentsToChain
 * @throws   {TypeError}
 * @param    {Object} args  pass through of funcs from server.[method]
 * @param    {Number} start index of args at which to start working with
 * @returns  {Array}
 */
function argumentsToChain(args, start) {
    assert.ok(args);

    args = Array.prototype.slice.call(args, start);

    if (args.length < 0) {
        throw new TypeError('handler (function) required');
    }

    var chain = [];

    function process(handlers) {
        for (var i = 0; i < handlers.length; i++) {
            if (Array.isArray(handlers[i])) {
                process(handlers[i], 0);
            } else {
                assert.func(handlers[i], 'handler');
                chain.push(handlers[i]);
            }
        }

        return (chain);
    }

    return (process(args));
}

function createApp(options) {

    var opts = shallowCopy(options || {});
    var app;

    opts.name = opts.name || 'Generic TMSP App';

    app = new App(opts);

    return (app);
}


function App(options){
	var self = this;
	EventEmitter.call(this);

	this.name = options.name;
	this.chain = [];
	this.router = new Router;
	this.routes = {};

	//TODO allow more options for server creation?
	this.server = server.createServer()

	this.addDefaultHandlers();

	//Handle requests
	this.server.on('request', function onRequest(req, res){
		//Do routing of request
		self.emit('request', req, res);
		self._setupRequest(req, res);
		self._handle(req, res);
	})
}
util.inherits(App, EventEmitter);

//Just a nicety
App.prototype.listen = function(){
	//TODO add default Port
	this.server.listen.apply(this, arguments)
}


//In order to be a TMSP app all messages must have default handlers 
//If the router can't find a handler the default will be used.
//This means that creations of an app will ALWAYS satisfy the TMSP messages


//NOTE: Default Handlers will not have the middlewar chain attached  by default
//If you want the middleware to be processed (... why?) you can call 
//App.addDefaultHandlers again after you have added the middleware 
App.prototype.addDefaultHandlers = function(){
    var self = this;
    this.ECHO(function(req, res, next){
        res.send({data: req.data,
        	log: "Default ECHO handler responding"})
        next()
    })
    this.FLUSH(function(req, res, next){
        res.send({log: "Default FLUSH handler responding"})
        res.flush();
        next()
    })
    types.methods.forEach(function(method){
    	method = method.toUpperCase();
    	if (method != 'ECHO' && method != 'FLUSH'){
    		self[method].call(self, function(req, res, next){
	            res.send({log: "Default " + method + " handler responding"})
	            next()
	        })
    	}
    })
        
}


function arrayOfFunctionsEh(arg){
	if (!Array.isArray(arg)){
		return false;
	} else {
		for (var i = 0; i < arg.length; i++) {
			if(!(arg[i] instanceof Function)){
				return false;
			}
		};
		return true;
	}
}


// Register all the routing methods
/**
 * Mounts a chain on the given path against this HTTP verb
 *
 * @public
 * @function del, get, head, opts, post, put, patch
 * @param   {String | Object} opts if string, the URL to handle.
 *                                 if options, the URL to handle, at minimum.
 * @returns {Route}                the newly created route.
 */
types.methods.forEach(function (method) {
    App.prototype[method] = function (name, handler) {
    	var opts = {};
    	//Do I want to program in route selection? If so. How?
        if (typeof (name) === 'string') {
            opts.name = name;
        } else if (name instanceof Function){
        	handler = [name];
        } else if (arrayOfFunctionsEh(name)){
        	handler = name;
        }

        if (handler === undefined) {
            throw new TypeError('handler (function) required');
        }

        opts.method = method.toUpperCase(); 

        var chain = [];
        var route;
        var self = this;

        function addHandler(h) {
            assert.func(h, 'handler');

            chain.push(h);
        }


        //The Router returns the route name based on options
        //Later the route name can be matched against to find the
        //Route to run
        var routeName = this.router.mount(opts)
        if (!routeName) {
        	throw new Error("Route Could not be added. Is there a duplicate?")
        }

        //This is where the handlers get added to every routes chain!
        this.chain.forEach(addHandler);
        //This is adding the routing functions to the chain
        argumentsToChain(handler).forEach(addHandler);
        //Final route is the chain constructed here 
        this.routes[routeName] = chain;

        return (routeName);
    };
});

//Add in other cases because why not?
types.methods.forEach(function (method) {
	App.prototype[method.toUpperCase()] = function(name, handler){
		this[method].call(this, name, handler);
	}
	App.prototype[method.toLowerCase()] = function(name, handler){
		this[method].call(this, name, handler);
	}
});



/**
 * Installs a list of handlers to run _before_ the "normal" handlers of all
 * routes.
 *
 * You can pass in any combination of functions or array of functions.
 * @public
 * @function use
 * @returns {Object} returns self
 */
App.prototype.use = function use() {
    var self = this;

    (argumentsToChain(arguments) || []).forEach(function (h) {
        self.chain.push(h);
    });

    return (this);
};


//Structure of an app

//Handler chain

module.exports = {
	App: App,
	createApp: createApp
};


///--- Private methods

/**
 * set up the request by before routing and executing handler chain.
 * @private
 * @function _setupRequest
 * @param    {Object}    req the request object
 * @param    {Object}    res the response object
 * @returns  {undefined}
 */
App.prototype._setupRequest = function _setupRequest(req, res) {
	//Can do any pre-modification of request and response object here
	//Before passing to handlers
	return
};

/**
 * upon receivng a request, route the request, then run the chain of handlers.
 * @private
 * @function _handle
 * @param    {Object} req the request object
 * @param    {Object} res the response object
 * @returns  {undefined}
 */
App.prototype._handle = function _handle(req, res) {
	var self = this;
    this._route(req, res, function (route) {
        req.route = route
        var r = route ? route.name : null;
        var chain = self.routes[r];

        self._run(req, res, route, chain, function done(e) {
            self.emit('after', req, res, route, e);
        });
    });
};


/**
 * look into the router, find the route object that should match this request.
 * @private
 * @function _route
 * @param    {Object}    req    the request object
 * @param    {Object}    res    the response object
 * @param    {String}    [name] name of the route
 * @param    {Function}  cb     callback function
 * @returns  {undefined}
 */
App.prototype._route = function _route(req, res, name, cb) {
    var self = this;

    //This is called if a name isn't provided and only a callback
    if (typeof (name) === 'function') {
        cb = name;
        name = null;

        this.router.find(req, res, cb);
    } else {
    	//If a name IS provided we can skip the search and just get it
        this.router.get(name, req, cb);
    }
};


/*
 * Callers can stop the chain from proceding if they do
 * return next(false); This is useful for non-errors, but where
 * a response was sent and you don't want the chain to keep
 * going.
 *
 * @private
 * @function _run
 * @param    {Object}    req   the request object
 * @param    {Object}    res   the response object
 * @param    {Object}    route the route object
 * @param    {Array}     chain array of handler functions
 * @param    {Function}  cb    callback function
 * @emits    redirect
 * @returns  {undefined}
 */
App.prototype._run = function _run(req, res, route, chain, cb) {
    var d;
    var i = -1;

    if (!req._anonFuncCount) {
        // Counter used to keep track of anonymous functions. Used when a
        // handler function is anonymous. This ensures we're using a
        // monotonically increasing int for anonymous handlers through out the
        // the lifetime of this request
        req._anonFuncCount = 0;
    }
    var self = this;
    var handlerName = null;
    var reqClosed = false;

    if (cb) {
        cb = once(cb);
    }

    // attach a listener for 'close' event, this will let us set a flag so that
    // we can stop processing the request if the client closes the connection
    // (or we lose the connection).
    function _requestClose() {
        reqClosed = true;
        req.clientClosed = true;
    }
    req.once('close', _requestClose);

    function next(arg) {
        var done = false;

        if (arg) {
            if (arg instanceof Error) {
                res.err(arg)
                done = true;
            }
        }

        if (arg === false) {
            done = true;
        }

        // Run the next handler up
        if (!done && chain[++i] && !reqClosed) {

            req._currentRoute = (route !== null ? route.name : 'OH NO!');
            handlerName = (chain[i].name || ('handler-' + req._anonFuncCount++));
            req._currentHandler = handlerName;

            var n = once(next);
//            n.ifError = ifError(n);
            return (chain[i].call(self, req, res, n));
        }

        req.removeListener('close', _requestClose);
        self.emit('done', req, res, route);

        return (cb ? cb(arg) : true);
    }

    var n1 = once(next);
//    n1.ifError = ifError(n1);

    d = domain.create();
    d.add(req);
    d.add(res);
    d.on('error', function onError(err) {
    	res.err(err)
    });
    d.run(n1);
};



