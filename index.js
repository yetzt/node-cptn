'use strict';
var exec = require('child_process').exec;
var http = require('http');
var fs = require('fs');

function prepareExec (command, options) {
	return function (data, callback) {
		exec(command, options, function (err, stdout, stderr) {
			var e;
			if (err || stderr) e = { error: err, stderr: stderr };
			callback(e, stdout);
		});
	};
}

module.exports = function (port, config) {
	if (!config) config = {};
	var hooks = [];

	function registerHook (/* name[, options], action */) {
		var name, options, action;
		if (arguments.length < 2) throw 'You must provide at least two arguments to cptn.hook()';
		options = (arguments.length === 2)? {} : arguments[1];
		name = arguments[0];
		action = arguments[arguments.length - 1];
		if (typeof action === 'string') action = prepareExec(action, options);

		hooks.push({ name: name, options: options, action: action });
	}

	var server = http.createServer(function (req, res) {
		if (req.method !== 'POST') {
			res.statusCode = 405;
			res.end();
			return;
		}
		var url = req.url.substr(1);
		var hook;
		for (var i=0; hook=hooks[i]; i++) { // jshint ignore:line
			if (url === hook.name) break;
		}
		if (!hook) {
			res.statusCode = 404;
			res.end();
			return;
		}

		var data = '';
		req.on('data', function (chunk) {
			data += chunk.toString();
		});
		req.on('end', function () {
			try {
				data = JSON.parse(data);
			} catch (e) {
				res.statusCode = 400;
				res.end();
				if (config.debug) console.error(e.message, e.stack);
			}

			try {
				hook.action(data, function (err) { if (err && config.debug) console.error(err); });
			} catch (e) {
				res.statusCode = 500;
				res.end();
				console.error(e.message, e.stack);
			}
		});

		res.statusCode = 200;
		res.end();
	});
	server.listen(port, function () {
		if (config.debug) console.log('Listening on %s', port);
	});

	// port is a UNIX socket file
	if (isNaN(parseInt(port))) {
		server.on('listening', function() {
			// set permissions
			if (config.debug) console.log('Changing socket permissions');
			return fs.chmod(port, '0777');
		});

		// double-check EADDRINUSE
		server.on('error', function(e) {
			if (e.code !== 'EADDRINUSE') throw e;
			// not in use: delete it and re-listen
			if (config.debug) console.log('Unlinking socket');
			fs.unlinkSync(port);
			server.listen(port);
		});
	}

	return {
		hook: registerHook,
	};
};
