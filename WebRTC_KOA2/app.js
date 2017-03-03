const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const controller = require('./controller');
const templating = require('./templating');
const WebSocket = require('ws');
const url = require('url');
const Cookies = require('cookies');
const WebSocketServer = WebSocket.Server;
const app = new Koa();

const isProduction = process.env.NODE_ENV === 'production';

// log request URL:
app.use(async (ctx, next) => {
    console.log(`Process ${ctx.request.method} ${ctx.request.url}...`);
    // var
    //     start = new Date().getTime(),
    //     execTime;
    await next();
    // execTime = new Date().getTime() - start;
    // ctx.response.set('X-Response-Time', `${execTime}ms`);
});

// parse user from cookie:
app.use(async (ctx, next) => {
    ctx.state.user = parseUser(ctx.cookies.get('name') || '');
    await next();
});

// static file support:
let staticFiles = require('./static-files');
app.use(staticFiles('/static/', __dirname + '/static'));

// parse request body:
app.use(bodyParser());

// add nunjucks as view:
app.use(templating('views', {
    noCache: !isProduction,
    watch: !isProduction
}));

// add controller:
app.use(controller());

const https = require('https');
const fs = require('fs');

var options = {
	key: fs.readFileSync('./keys/ca-key.pem'),
	ca: [fs.readFileSync('./keys/ca-cert.pem')],
	cert: fs.readFileSync('./keys/ca-cert.pem')
};

let httpsServer = https.createServer(options, app.callback());
httpsServer.listen(3000, '10.205.43.19');

function parseUser(obj) {
    if (!obj) {
        return;
    }
    console.log('try parse: ' + obj);
    let s = '';
    if (typeof obj === 'string') {
        s = obj;
    } else if (obj.headers) {
        let cookies = new Cookies(obj, null);
        s = cookies.get('name');
    }
    if (s) {
        try {
            let user = JSON.parse(Buffer.from(s, 'base64').toString());
            console.log(`User: ${user.name}, ID: ${user.id}`);
            return user;
        } catch (e) {
            // ignore
        }
    }
}

// 创建WebSocketServer:
function createWebSocketServer(server, onMessage, onClose, onError) {
    let wss = new WebSocketServer({
        server: server
    });
    wss.users = {};
    wss.broadcast = function broadcast(data) {
        wss.clients.forEach(function each(client) {
            client.send(data);
        });
    };
    onMessage = onMessage || function (msg) {
        console.log('[WebSocket] message received: ' + msg);
    };
    onClose = onClose || function (code, message) {
        console.log(`[WebSocket] closed: ${code} - ${message}`);
    };
    onError = onError || function (err) {
        console.log('[WebSocket] error: ' + err);
    };
    wss.on('connection', function (ws) {
        let location = url.parse(ws.upgradeReq.url, true);
        console.log('[WebSocketServer] connection: ' + location.href);
        ws.on('message', onMessage);
        ws.on('close', onClose);
        ws.on('error', onError);
        if (location.pathname !== '/ws/chat') {
            // close ws:
            ws.close(4000, 'Invalid URL');
        }
        // // check user:
        // let user = parseUser(ws.upgradeReq);
        // if (!user) {
        //     ws.close(4001, 'Invalid user');
        // }
        // ws.user = user;
        ws.wss = wss;
    });
    console.log('WebSocketServer was attached.');
    return wss;
}

var messageIndex = 0;

function createMessage(type, user, data) {
    messageIndex ++;
    return JSON.stringify({
        id: messageIndex,
        type: type,
        user: user,
        data: data
    });
}

function sendTo(conn, message) {
	conn.send(JSON.stringify(message));
}

function onMessage(message) {
    console.log('Got message', message);
    var data;
    try{
        data = JSON.parse(message);
    } catch (e) {
        console.log("Error parsing JSON");
        data = {};
    }
    
    switch(data.type) {
        case 'login':{
            let user = JSON.parse(Buffer.from(data.name, 'base64').toString());
            console.log(`User: ${user.name}, ID: ${user.id}`);
            this.user = user;
            this.name = user.name;
            this.wss.users[user.name] = this;

            let msg = createMessage('join', user, `${user.name} joined.`);
            this.wss.broadcast(msg);
            // build user list:
            let users = this.wss.clients.map(function (client) {
                return client.user;
            });
            this.send(createMessage('list', user, users));
            break;
        }
        case 'chat': {
            let msg = createMessage('chat', this.user, data.content.trim());
            this.wss.broadcast(msg);
            break;
        }
        case "offer":
            console.log("Sending offer to", data.name);
            var conn = this.wss.users[data.name];
            if(conn != null){
                this.otherName = data.name;
                sendTo(conn, {
                    type:"offer",
                    offer:data.offer,
                    name:this.name
                });
            }
            break;
        case "answer":
            console.log("Sending answer to", data.name);
            var conn = this.wss.users[data.name];
            if(conn != null) {
                this.otherName = data.name;
                sendTo(conn, {
                    type:"answer",
                    answer:data.answer
                })
            }
            break;
        case "candidate":
            console.log("Sending candidate to", data.name, data.candidate);
            var conn = this.wss.users[data.name];
            if(conn != null){
                sendTo(conn, {
                    type:"candidate",
                    candidate:data.candidate
                })
            }
            break;
        case "leave":
            console.log("Disconnecting user from", data.name);
            var conn = this.wss.users[data.name];
            if(conn != null) {
                conn.otherName = null;
                sendTo(conn, {
                    type:"leave"
                })
            }
            break;
        default:
            console.log("Unrecognized:", data);
    }
}

function onClose() {
    let user = this.user;
    let msg = createMessage('left', user, `${user.name} is left.`);
    this.wss.broadcast(msg);

    if(this.name) {
        delete this.wss.users[this.name];

        if(this.otherName) {
            console.log("Disconnecting user from", this.otherName);
            var conn = this.wss.users[this.otherName];
            if(conn != null) {
                conn.otherName = null;
                sendTo(conn, {
                    type:"leave"
                });
            }
        }
    }
}

app.wss = createWebSocketServer(httpsServer, onMessage, onClose);

console.log('app started at port 3000...');