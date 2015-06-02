# Cptn

Cptn is a quick and easy web server that responds to POST requests containing JSON data. It’s meant for use with GitLab webhooks.

## Usage

```js
var captain = require('cptn')(9000);
captain.hook('myproject/push', { cwd: '.' }, 'echo "Push received" >> captains-log');
captain.hook('myproject/merge-request', function (data, done) { console.log(data); done(); });
```

This starts a new Cptn server, makes it listen on port 9000 (a Unix socket can be used instead by passing a string) and attaches two hooks: `myproject/push` and `myproject/merge`.

`myproject/push` will be called when sending a POST request to localhost:9000/myproject/push. It will run the provided unix command.

`myproject/merge-request` will be called when sending a POST request to localhost:9000/myproject/merge-request. It will log the received `data` (the JSON body of the POST request).

You can try it with these `curl` commands:

```sh
curl -H "Content-type: application/json" -X POST -d '{}' http://localhost:9000/myproject/push
curl -H "Content-type: application/json" -X POST -d '{"foo": "bar"}' http://localhost:9000/myproject/merge-request
```

## API Documentation

### Cptn(port, options)

Starts a new Cptn server and listens on the specified `port` (a port number or Unix socket name).

Returns a Cptn server instance.

Accepts the following arguments:

- **port** (required) A port number or socket to listen on.
- **options** (optional) An object with the following options:
  - **debug** (optional, defaults to `false`) Whether to log debug output to the console.

### captain#hook(url[, options], action)

Attaches a hook that will call the specified `action` each time a POST request is sent to the path specified with `name`.

Returns nothing.

Accepts the following arguments:

- **url** (required) A url at which the hook can be reached. No leading slash.
- **options** (optional) An object that will be passed to [`child_process.exec()`](https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback) if a Unix command is specified as the `action`. Currently ignored if a callback is passed as `action`, but may be used in future versions.
- **action** (required) An action that will be called upon a POST request to the specified `url`. Can be a **string**, in which case it will be passed – together with the `options` object – to `child_process.exec()` or a **function** with the signature `(data, callback)`. `data` will contain the body of the POST request. `callback()` should be called when you're done doing what you had to do. It currently has no effect but most likely will in future versions.

## Server Behaviour

The server currently responds with a status code and an empty body. It returns 200 (OK) when a hook was found and successfully invoked, 404 (Not Found) when no hook was found, 405 (Method Not Allowed) when the request was not a POST request, 400 (Bad Request) when the body is not valid JSON, and 500 (Internal Server Error) when there was a problem invoking the hook.
