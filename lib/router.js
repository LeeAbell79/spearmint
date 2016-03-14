var assert = require('assert-plus');
var EventEmitter = require('events').EventEmitter;
var util = require('util');

var types = require('./types');

//Stupid function to ensure I don't mess up anywhere
function compileRouteName(method, name){
    method = method.toUpperCase()
    if (!name){
        return method;
    } else {
        return method + "-" + name;
    }
}

//Admitedly this rputer is unnecessary at this point...

///--- API

/**
 * Router class handles mapping of http verbs and a regexp path,
 * to an array of handler functions.
 * @class
 * @public
 * @param  {Object} options an options object
 */
function Router(options) {
    var self = this;
    EventEmitter.call(this);

    this.mounts = {};
    this.name = 'TMSP Router';

    this.defaultRoutes = {}
    this.addDefaultRoutes();
    this.masterList = {};

}
util.inherits(Router, EventEmitter);

module.exports = Router;

//In order to be a TMSP app all messages must have default handlers 
//The router knows these exist and have standard form
//so it adds them to default routers incase a matching ever fails
Router.prototype.addDefaultRoutes = function(){
    var self = this;
    types.methods.forEach(function(method){
        method = method.toUpperCase();

        var  name = compileRouteName(method);
        var route = {
            name: name,
            method: method
        }
        self.defaultRoutes[method] = route;
    })
}



/**
 * adds a route.
 * @public
 * @function mount
 * @param    {Object} options an options object
 * @returns  {String}         returns the route name if creation is successful.
 */
Router.prototype.mount = function mount(options) {
    assert.object(options, 'options');
    assert.string(options.method, 'options.method');
    assert.optionalString(options.name, 'options.name');

    options.method = options.method.toUpperCase()

    var route = {};
    var self = this;
    route.method = options.method;
    route.name = compileRouteName(options.method, options.name)

    this.masterList[route.name] = route;

    this.emit('mount', route.method, route.name);

    return (route.name);
};

/**
 * get a route from the router.
 * @public
 * @function get
 * @param    {String}    name the name of the route to retrieve
 * @param    {Object}    req  the request object
 * @param    {Function}  cb   callback function
 * @returns  {undefined}
 */
Router.prototype.get = function get(name, req, cb) {
    console.log("getting")
    var route;
    var method = req.method.toUpperCase();
    var routeName = compileRouteName(method, name)

    route = this.masterList[routeName];
    if (route) {
        cb(route);
    } else {
        route = this.defaultRoutes[method]
        cb(route);
    }
};


//This is a dumb find method using req.name field to find the route
Router.prototype.find = function get(req, res, cb) {
    var params;
    var route = false;
    var method = req.method.toUpperCase();
    var routeName = compileRouteName(method, req.name);

    route = this.masterList[routeName];
    if (route) {
        cb(route);
    } else {
        route = this.defaultRoutes[method]
        cb(route);
    }
};