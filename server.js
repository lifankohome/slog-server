const {WebSocketServer} = require('ws');
const http = require('http');
const fs = require('fs')

const CFG_PATH = __dirname + '/config.json'

let config = fs.existsSync(CFG_PATH)
let wsServer = null
let connections = {}

if (config === true) {
    config = fs.readFileSync(CFG_PATH, 'utf8')
    config = JSON.parse(config)

    // check property
    if (!config.hasOwnProperty('ws')) {
        log('Launch Failed: No [ws] Config Found.')
    }
    if (!config.hasOwnProperty('http')) {
        log('Launch Failed: No [http] Config Found.')
    }
    if (!config.hasOwnProperty('socket')) {
        log('Launch Failed: No [socket] Config Found.')
    }

    log('[ws] Starting...')
    start_ws(config.ws, function (status, wsServer) {
        if (status === 1) {
            wsServer.on('connection', function connection(ws, req) {
                let path_check = req.url.substr(0, config.ws.path.length)

                if (path_check === config.ws.path) {
                    let date = new Date()
                    ws.send('Welcome to Slog @' + date.toLocaleTimeString());

                    let uuid = req.url.substr(config.ws.path.length + 1)
                    if (connections.hasOwnProperty('uuid') === false) {
                        connections[uuid] = []
                    }
                    if (connections[uuid].indexOf(uuid) === -1) {
                        connections[uuid].push(ws)
                    }

                    ws.uuid = uuid
                } else {
                    ws.send('Server Refused!')

                    ws.terminate()
                }
            });
        }
    })

    log('[http] Starting...')
    start_http(config.http, function (status) {
    })
} else {
    log('Launch Failed: No Config File Found.')
}

function log(msg, type = 'info') {
    console.log('[' + type.toUpperCase() + ']@' + msg + "\n")
}

function start_ws(config, callback) {
    let status = 0
    if (config.enable === true) {
        wsServer = new WebSocketServer({
            port: config.port,
            path: config.path
        });

        log('[ws] Started')
        status = 1
    } else {
        log('[ws] Start Abort')
        status = -1
    }
    callback(status, wsServer)
}

function send_to(path, obj) {
    if (wsServer !== null) {
        let uuid = decodeURI(path).replace(' ', '_').substr(1)

        wsServer.clients.forEach(function each(client) {
            if (client.uuid === uuid) {
                client.send(obj);
            } else {
                // other clients
            }
        });
    } else {
        log('[ws] Inactive')
    }
}

function start_http(config, callback) {
    let status = 0
    let httpServer = null
    if (config.enable === true) {
        httpServer = http.createServer(function (request, response) {
            if (request.url === '/favicon.ico') {
                return;
            }
            if ('POST' === request.method) {
                let requestBody = '';
                request.on('data', function (data) {
                    requestBody += data;
                });
                request.on('end', function () {
                    response.end('success');

                    send_to(request.url, requestBody)
                });
            } else {
                response.end('Only Post Accept - Slog Http Server');
            }
        });
        httpServer.listen(config.port);

        log('[http] Started')
        status = 1
    } else {
        log('[http] Start Abort')
        status = -1
    }
    callback(status, httpServer)
}
