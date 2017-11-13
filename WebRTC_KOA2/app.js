const Koa = require('koa');
const bodyParser = require('koa-bodyparser');
const controller = require('./controller');
const templating = require('./templating');
const WebSocket = require('ws');
const url = require('url');
const Cookies = require('cookies');
const WebSocketServer = WebSocket.Server;
const app = new Koa();

const defaultRoom = 'Common Room';

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
	key: fs.readFileSync('./keys/ryans-key.pem'),
	cert: fs.readFileSync('./keys/ryans-cert.pem'),

    ca: [fs.readFileSync('./keys/ryans-cert.pem')]
};

let httpsServer = https.createServer(options, app.callback());
httpsServer.listen(3000, '10.205.43.6');

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
    wss.talks = new Map();
    wss.rooms = new Map();
    wss.files = new Map();
    wss.rooms.set(defaultRoom, new Set());
    wss.broadcast = function broadcast(data, dest) {
        if (dest === null) {
            wss.clients.forEach(function each(client) {
                client.send(data);
            });
        } else {
            let room = wss.rooms.get(dest);
            wss.clients.forEach(function each(client) {
                if(room.has(client.name)) {
                    client.send(data);
                }
            });
        }
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
            this.current_room = defaultRoom;

            let msg = createMessage('online', user, `${user.name} online.`);
            this.wss.broadcast(msg, null);

            msg = createMessage('join', user, `${user.name} joined.`);
            this.wss.rooms.get(this.current_room).add(this.name);
            this.wss.broadcast(msg, this.current_room);
            // build user list:
            let users = this.wss.clients.map(function (client) {
                return client.user;
            });
            this.send(createMessage('list', user, users));
            // room user list:
            let room_users = [];
            let currentRoom = this.wss.rooms.get(this.current_room);
            for(var idx in this.wss.clients){  
                let client = this.wss.clients[idx];
                if(currentRoom.has(client.user.name)) {
                    room_users.push(client.user);
                }
            };
            this.send(createMessage('rlist', user, room_users));
            break;
        }
        case 'switch': {
            console.log('###');
            for (let item of this.wss.talks.entries()) {
                console.log(item[0], item[1]);
            }
            let msg = createMessage('left', this.user, `${this.name} is left.`);
            this.wss.broadcast(msg, this.current_room);
            this.wss.rooms.get(this.current_room).delete(this.name);

            if(this.wss.rooms.has(data.room)) {
                this.wss.rooms.get(data.room).add(this.name);
            } else {
                this.wss.rooms.set(data.room, new Set());
                this.wss.rooms.get(data.room).add(this.name);
            }
            this.current_room = data.room;

            let room_users = [];
            let currentRoom = this.wss.rooms.get(this.current_room);
            for(var idx in this.wss.clients){  
                let client = this.wss.clients[idx];
                if(currentRoom.has(client.user.name)) {
                    room_users.push(client.user);
                }
            };
            this.send(createMessage('rlist', this.user, room_users));
            
            msg = createMessage('join', this.user, `${this.name} joined.`);
            this.wss.broadcast(msg, this.current_room);
            break;
        }
        case 'chat': {
            let msg = createMessage('chat', this.user, data.content.trim());
            this.wss.broadcast(msg, data.dest);
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
                    answer:data.answer,
                    name:this.name
                })
            }
            break;
        case "candidate":
            console.log("Sending candidate to", data.name, data.candidate);
            var conn = this.wss.users[data.name];
            if(conn != null){
                sendTo(conn, {
                    type:"candidate",
                    candidate:data.candidate,
                    name:this.name
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
            this.wss.talks.delete(this.name);
            this.wss.talks.delete(data.name);
            break;
        case "check_available":
            var conn = this.wss.users[data.to];
            sendTo(conn, {
                type:"check_available",
                name:this.name
            })
            break;
        case "confirm_available":
            var conn = this.wss.users[data.from];

            sendTo(conn, {
                type:"confirm_available",
                name:this.name,
                status:data.status
            })

            if (data.status === 'accept') {
                if(this.wss.talks.has(this.name)) {
                    let raw_user = this.wss.talks.get(this.name);
                    var raw_conn = this.wss.users[raw_user];
                    if(raw_conn != null) {
                        raw_conn.otherName = null;
                        sendTo(raw_conn, {
                            type:"leave"
                        })
                    }
                    this.wss.talks.delete(raw_user);
                }

                this.wss.talks.set(data.from, this.name);
                this.wss.talks.set(this.name, data.from);
            }

            break;
        case 'check_file':
            if (this.wss.files.has(this.name) || this.wss.files.has(data.name)) {
                sendTo(this, {
                    type: "confirm_file",
                    name: data.name,
                    status: "deny"
                })
            } else {
                this.wss.files.set(data.name, this.name);
                this.wss.files.set(this.name, data.name);

                var conn = this.wss.users[data.name];
                if(conn != null) {
                    this.otherName = data.name;
                    sendTo(conn, {
                        type: "check_file",
                        name: this.name,
                        file_name: data.file_name,
                        size: data.size,
                    });
                }
            }
            break;
        case 'confirm_file':
            var conn = this.wss.users[data.from];
        
            sendTo(conn, {
                type:"confirm_file",
                name:this.name,
                status:data.status
            })

            if (data.status === 'deny') {
                this.wss.files.delete(this.name);
                this.wss.files.delete(data.from);
            }

            break;
        case 'desc':
            var conn = this.wss.users[data.name];
            if(conn != null){
                sendTo(conn, {
                    type: "desc",
                    name: this.name,
                    info: data.info
                })
            }
            break;
        case 'candidate_file':
            var conn = this.wss.users[data.name];
            if(conn != null){
                sendTo(conn, {
                    type:"candidate_file",
                    candidate:data.candidate,
                    name:this.name
                })
            }
            break;
        case 'file_reset':
            this.wss.files.delete(this.name);
            break;
        default:
            console.log("Unrecognized:", data);
    }
}

function onClose() {
    let user = this.user;
    let msg = createMessage('left', user, `${user.name} is left.`);
    this.wss.broadcast(msg, this.current_room);

    msg = createMessage('offline', user, `${user.name} offline.`);
    this.wss.broadcast(msg, null);

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
