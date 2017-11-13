'use strict'

function addToUserList(list, user) {
    var i;
    for (i=0; i<list.length; i++) {
        if (list[i].id === user.id) {
            return;
        }
    }
    list.push(user);
}

function removeFromUserList(list, user) {
    var i, target = -1;
    for (i=0; i<list.length; i++) {
        if (list[i].id === user.id) {
            target = i;
            break;
        }
    }
    if (target >= 0) {
        list.splice(target, 1);
    }
}

function addMessage(list, msg) {
    list.push(msg);
    $('#message-list').parent().animate({
        scrollTop: $('#message-list').height()
    }, 1000);
}

function getAttri(s, st, ed) {
    let pos = s.indexOf(st);
    if(pos === -1)
        return "";
    else {
        pos = pos + st.length;
        let pos2 = s.indexOf(ed, pos);
        if(pos2 === -1)
            return s.substr(pos);
        else 
            return s.substr(pos, pos2 - pos);
    }
}

function getRestAttri(s, st, ed) {
    let pos = s.indexOf(st);
    if(pos === -1)
        return s;
    else {
        let ret = s.substr(0, pos);
        pos = pos + st.length;
        let pos2 = s.indexOf(ed, pos);
        if(pos2 === -1)
            return ret;
        else 
            return ret + s.substr(pos2 + ed.length);
    }
}

$(function () {

    var vmMessageList = new Vue({
        el: '#message-list',
        data: {
            messages: []
        }
    });

    var vmRoomSetting = new Vue({
        el: '#room-setting',
        data: {
            current_room: 'Common Room',
            room_name: '',
        },
        methods: {
            switch_room: function () {
                if (this.room_name === this.current_room) {
                    alertify.warning('Same room. ');
                    return;
                }

                var text = {};
                text.type = 'switch';
                text.room = this.room_name;
                console.log(text);
                if (text.room) {
                    this.current_room = this.room_name;
                    this.room_name = '';
                    ws.send(JSON.stringify(text));
                } else {
                    alertify.warning('No message.');
                }
            }
        }
    })

    var vmUserList = new Vue({
        el: '#user-list',
        data: {
            users: []
        },
        methods: {
            choose: function (username, curuser) {
                if (destuser.show_status) {
                    alertify.error('You are already on call.');
                } else if (username === curuser)
                    alertify.error('Hello ' + username + ', you cannot call yourself!');
                else {
                    alertify.success('Hello ' + username + ', please choose actions on the right.');
                    destuser.target = username;
                }
           }
        }
    });

    var vmRoomUserList = new Vue({
        el: '#room-user-list',
        data: {
            room_users: []
        },
    });
    
    var destuser = new Vue({
        el: '#dest-user',
        data: {
            target: "none",
            show_status: false,
            file_name: '',
            file_size: ''
        },
        methods: {
            call: function() {
                if (this.target === "none") {
                    alertify.error('Please choose a user from list.');
                } else if (this.show_status) {
                    alertify.error('You are already on call.');
                } else {
                    alertify.success('Calling to ' + this.target + '.');
                    this.show_status = true;

                    var text = {};
                    text.type = 'check_available';
                    text.to = this.target;
                    ws.send(JSON.stringify(text));
                }
            },
            hang_up: function() {
                if (destuser.target === "none") {
                    alertify.error('You are idle now.');
                }
                else {
                    this.show_status = false;
                    send({ 
                        type: "leave" 
                    });
            
                    onLeave(); 
                    this.target = "none";
                }
            },
            send: function() {
                if (this.target === "none") {
                    alertify.error('No receiver choosen.');
                } else if (this.file_name === "") {
                    alertify.error('No file choosen.');
                } else if (file_role) {
                    alertify.error('You are transferring another file now.');
                } else {
                    var file_Input = document.querySelector('input#fileInput');
                    var file = fileInput.files[0];
                    sendFileSig({
                        type: "check_file",
                        name: this.target,
                        file_name: file.name,
                        size: file.size
                    });
                }
            }
        }
    });

    var ws = new WebSocket('wss://10.205.43.6:3000/ws/chat');

    ws.onopen = function(){
        console.log("connected");
        ws.local_name = '';
        ws.call_state = 'idle';
        ws.send(JSON.stringify({
            type: 'login',
            name: getAttri(document.cookie, 'name=', ';')
        }));

        startConnection();
    };
    
    ws.onmessage = function(event) {
        var data = event.data;
        console.log(data);
        var msg = JSON.parse(data);
        console.log(vmRoomUserList.room_users);
        switch (msg.type ) {
            case 'list':
                vmUserList.users = msg.data;
                break;
            case 'rlist':
                vmRoomUserList.room_users = msg.data;
                break;
            case 'online':
                addToUserList(vmUserList.users, msg.user);
                break;
            case 'offline':
                removeFromUserList(vmUserList.users, msg.user);
                break;
            case 'join':
                addToUserList(vmRoomUserList.room_users, msg.user);
                if(ws.local_name === '') {
                    ws.local_name = msg.user.name;
                }
                addMessage(vmMessageList.messages, msg);
                break;
            case 'left':
                if(msg.user.name === ws.local_name) {
                    vmMessageList.messages = [];
                } else {
                    addMessage(vmMessageList.messages, msg);
                    removeFromUserList(vmRoomUserList.room_users, msg.user);
                }
                break;
            case 'chat':
                addMessage(vmMessageList.messages, msg);
            break;
            case 'login':
                onLogin(msg.success);
                break;
            case 'offer':
                onOffer(msg.offer, msg.name);
                destuser.target = msg.name;
                destuser.show_status = true;
                break;
            case 'answer':
                onAnswer(msg.answer);
                break;
            case 'candidate':
                onCandidate(msg.candidate);
                break;
            case 'leave':
                alertify.success('Call end.');
                onLeave();
                destuser.target = 'none';
                destuser.show_status = false;
                break;
            case 'check_available':
                alertify.confirm('Call from ' + msg.name + '.',
                    function(){
                        alertify.success('Accept');
                        var text = {};
                        text.type = 'confirm_available';
                        text.from = msg.name;
                        text.status = 'accept';
                        ws.send(JSON.stringify(text));
                    },
                    function(){
                        alertify.error('Deny');
                        var text = {};
                        text.type = 'confirm_available';
                        text.from = msg.name;
                        text.status = 'deny';
                        ws.send(JSON.stringify(text));
                    });
                break;
            case 'confirm_available':
                if (msg.name === destuser.target) {
                    if (msg.status === 'accept') {
                        alertify.success('Call start.');
                        startPeerConnection(destuser.target);
                    } else {
                        alertify.error('Callee reject.');
                        destuser.show_status = false;
                    }
                } else {
                    alertify.error('User not match.')
                }
                break;
            case 'check_file':
                alertify.confirm('File ' + msg.file_name + ' from ' + msg.name + '.',
                    function(){
                        alertify.success('Accept');
                        var text = {};
                        text.type = 'confirm_file';
                        text.from = msg.name;
                        text.file_name = msg.file_name;
                        text.status = 'accept';
                        ws.send(JSON.stringify(text));
                        createConnection('receive', msg.name);
                        destuser.file_name = msg.file_name;
                        destuser.file_size = msg.size;
                        receiveProgress.max = msg.size;
                    },
                    function(){
                        alertify.error('Deny');
                        var text = {};
                        text.type = 'confirm_file';
                        text.from = msg.name;
                        text.file_name = msg.file_name;
                        text.status = 'deny';
                        ws.send(JSON.stringify(text));
                    });
                break;
            case 'confirm_file':
                if (msg.name === destuser.target) {
                    if (msg.status === 'accept') {
                        alertify.success('Sending ...');
                        createConnection('send', msg.name);
                    } else {
                        alertify.error('Reject.');
                    }
                } else {
                    alertify.error('File not match.')
                }
                break;
            case 'desc':
                if (file_role === 'sender') {
                    console.log('Answer from receiveConnection \n' + msg.info.sdp);
                    sendConnection.setRemoteDescription(msg.info);
                } else if (file_role === 'receiver') {
                    console.log('Offer from sendConnection \n' + msg.info.sdp);
                    receiveConnection.setRemoteDescription(msg.info);
                    receiveConnection.createAnswer().then(
                        gotDescription2,
                        onCreateSessionDescriptionError
                    );
                } else {
                    alertify.error('No file transfer. ');
                }
                break;
            case 'candidate_file':
                if (file_role === 'sender') {
                    sendConnection.addIceCandidate(msg.candidate).then(
                        function() {
                            onAddIceCandidateSuccess();
                        },
                        function(err) {
                            onAddIceCandidateError(err);
                        }
                    );
                } else if (file_role === 'receiver') {
                    receiveConnection.addIceCandidate(msg.candidate).then(
                        function() {
                            onAddIceCandidateSuccess();
                        },
                        function(err) {
                            onAddIceCandidateError(err);
                        }
                    );
                } else {
                    alertify.error('Undefined behavior.');
                }
                
                console.log(' ICE candidate: \n' + (msg.candidate ? msg.candidate.candidate : '(null)'));
                break;
            default:
                break;
        } 
    };

    ws.onclose = function (evt) {
        console.log('[closed] ' + evt.code);
        var input = $('#form-chat').find('input[type=text]');
        input.attr('placeholder', 'WebSocket disconnected.');
        input.attr('disabled', 'disabled');
        $('#form-chat').find('button').attr('disabled', 'disabled');
    };

    ws.onerror = function (code, msg) {
        console.log('[ERROR] ' + code + ': ' + msg);
    };

    $('#form-chat').submit(function (e) {
        e.preventDefault();
        var input = $(this).find('input[type=text]');
        var text = {};
        text.content = input.val().trim();
        text.type = 'chat';
        text.dest = vmRoomSetting.current_room;
        console.log(text);
        if (text.content) {
            input.val('');
            ws.send(JSON.stringify(text));
        } else {
            alertify.warning('No message.');
        }
    });

    //WebRTC

    function send(message){
        if(connectedUser && !message.name){
            message.name = connectedUser;
        }

        ws.send(JSON.stringify(message));
    };

    function sendFileSig(message){
        if( connectedFileUser && !message.name){
            message.name = connectedFileUser;
        }

        ws.send(JSON.stringify(message));
    };

    function onOffer(offer, name) { 
        connectedUser = name; 
        yourConnection.setRemoteDescription(new RTCSessionDescription(offer));
        
        yourConnection.createAnswer(function (answer) {
            yourConnection.setLocalDescription(answer); 

            send({ 
                type: "answer", 
                answer: answer 
            }); 
        }, function (error) { 
            alertify.error("An error has occurred"); 
        });
    }

    function onAnswer(answer) { 
        yourConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }

    function onCandidate(candidate) {
        yourConnection.addIceCandidate(new RTCIceCandidate(candidate)); 
    }

    function onLeave() {
        connectedUser = null; 
        theirVideo.src = null; 
        yourConnection.close(); 
        yourConnection.onicecandidate = null; 
        yourConnection.onaddstream = null; 
        setupPeerConnection(stream);
    }

    function hasUserMedia() {
        navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia ||
            navigator.msGetUserMedia;

        return !!navigator.getUserMedia;
    }

    function hasRTCPeerConnection() {
        window.RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
        window.RTCSessionDescription = window.RTCSessionDescription || window.webkitRTCSessionDescription || window.mozRTCSessionDescription;
        window.RTCIceCandidate = window.RTCIceCandidate || window.webkitRTCIceCandidate || window.mozRTCIceCandidate;

        return !!window.RTCPeerConnection;
    }

    let yourVideo = document.querySelector('#yours'),
        theirVideo = document.querySelector('#theirs'),
        yourConnection, connectedUser, stream;

    function startConnection() {
        if(hasUserMedia()) {
            navigator.getUserMedia ({video: true, audio: true}, 
            function(myStream) {
                stream = myStream;
                yourVideo.srcObject = stream;
                
                if(hasRTCPeerConnection()) {
                    var p = new Promise((resolve, reject) => {
                        setTimeout(function(){
                            setupPeerConnection(stream);
                            resolve();
                        }, 1000);
                    });
                    
                    p.then((data) => {
                        alertify.success('Ready for WebRTC talk.');
                    }, (reason) => {
                        console.log(reason);
                    });
                } else {
                    alertify.error("Sorry, your browser does not support WebRTC.");
                }
            }, 
            function (error) {
                console.log(error);
            });
        } else {
            alertify.error("Sorry, your browser does not support WebRTC.");
        }
    }

    function setupPeerConnection(stream) {
        var configuration = {
            "iceServers": [{"urls":"stun:stun.l.google.com:19302"}]
        };

        yourConnection = new RTCPeerConnection(configuration);
        yourConnection.addStream(stream);
        yourConnection.onaddstream = function(e) {
            theirVideo.srcObject = e.stream;
        }

        yourConnection.onicecandidate = function(event) {
            if(event.candidate ) {
                send({
                    type:"candidate",
                    candidate: event.candidate
                });
            }
        };
    }

    function startPeerConnection(user) { 
        connectedUser = user;
        // Begin the offer 
        yourConnection.createOffer(function (offer) { 
            send({ 
                type: "offer", 
                offer: offer 
            }); 
            yourConnection.setLocalDescription(offer); 
        }, function (error) {
            alertify.error("An error has occurred."); 
        }); 
    };

    // File Transfer

    var sendConnection;
    var receiveConnection;
    var sendChannel;
    var receiveChannel;
    var pcConstraint;
    var bitrateDiv = document.querySelector('div#bitrate');
    var fileInput = document.querySelector('input#fileInput');
    var downloadAnchor = document.querySelector('a#download');
    var sendProgress = document.querySelector('progress#sendProgress');
    var receiveProgress = document.querySelector('progress#receiveProgress');
    var statusMessage = document.querySelector('span#status');
    var file_role, connectedFileUser;

    var receiveBuffer = [];
    var receivedSize = 0;
    
    var bytesPrev = 0;
    var timestampPrev = 0;
    var timestampStart;
    var statsInterval = null;
    var bitrateMax = 0;
    
    fileInput.addEventListener('change', handleFileInputChange, false);
    
    function handleFileInputChange() {
        var file = fileInput.files[0];
        if (!file) {
            Alertify.error('No file chosen.');
        } else {
            destuser.file_name = file;
        }
    }
    
    function createConnection(direction, oppo) {
        var servers = null;
        pcConstraint = null;
        connectedFileUser = oppo;
        
        if (direction === 'send') {
            // Add sendConnection to global scope to make it visible
            // from the browser console.
            file_role = 'sender';

            window.sendConnection = sendConnection = new RTCPeerConnection(servers,
                pcConstraint);
            console.log('Created local peer connection object sendConnection');

            sendChannel = sendConnection.createDataChannel('sendDataChannel');
            sendChannel.binaryType = 'arraybuffer';
            console.log('Created send data channel');

            sendChannel.onopen = onSendChannelStateChange;
            sendChannel.onclose = onSendChannelStateChange;

            console.log(sendChannel.readyState)
            sendConnection.onicecandidate = function(event) {
                console.log(sendChannel.readyState)
                if(event.candidate ) {
                    sendFileSig({
                        type:"candidate_file",
                        candidate: event.candidate
                    });
                }
            };

            sendConnection.createOffer().then(
                gotDescription1,
                onCreateSessionDescriptionError
            );
        } else if (direction === 'receive') {
            // Add receiveConnection to global scope to make it visible
            // from the browser console.
            file_role = 'receiver';

            window.receiveConnection = receiveConnection = new RTCPeerConnection(servers,
                pcConstraint);
            console.log('Created remote peer connection object receiveConnection');

            receiveConnection.onicecandidate = function(event) {
                if(event.candidate ) {
                    sendFileSig({
                        type:"candidate_file",
                        candidate: event.candidate
                    });
                }
            };
            receiveConnection.ondatachannel = receiveChannelCallback;

            fileInput.disabled = true;
        }
    }
    
    function onCreateSessionDescriptionError(error) {
        console.log('Failed to create session description: ' + error.toString());
    }
    
    function sendData() {
        var file = fileInput.files[0];
        console.log('File is ' + [file.name, file.size, file.type,
            file.lastModifiedDate
        ].join(' '));
    
        // Handle 0 size files.
        statusMessage.textContent = '';
        downloadAnchor.textContent = '';
        if (file.size === 0) {
            bitrateDiv.innerHTML = '';
            statusMessage.textContent = 'File is empty, please select a non-empty file';
            closeDataChannels();
            return;
        }
        sendProgress.max = file.size;
        var chunkSize = 16384;
        var sliceFile = function(offset) {
            var reader = new window.FileReader();
            reader.onload = (function() {
                return function(e) {
                    sendChannel.send(e.target.result);
                    if (file.size > offset + e.target.result.byteLength) {
                        window.setTimeout(sliceFile, 0, offset + chunkSize);
                    }
                    sendProgress.value = offset + e.target.result.byteLength;
                };
            })(file);
            var slice = file.slice(offset, offset + chunkSize);
            reader.readAsArrayBuffer(slice);
        };
        sliceFile(0);
    }
    
    function closeDataChannels() {
        console.log('Closing data channels');

        if (file_role === 'sender') {
            sendChannel.close();
            console.log('Closed data channel with label: ' + sendChannel.label);

            sendConnection.close();
            sendConnection = null;
        }

        if (receiveChannel) {
            receiveChannel.close();
            console.log('Closed data channel with label: ' + receiveChannel.label);
        }
    
        if(file_role === 'receiver') {
            receiveConnection.close();
            receiveConnection = null;
        }

        connectedFileUser = null;
        file_role = null;
    
        console.log('Closed peer connections');

        // re-enable the file select
        fileInput.disabled = false;

        sendFileSig({
            type: 'file_reset',
        })
    }
    
    function gotDescription1(desc) {
        sendConnection.setLocalDescription(desc);
        console.log(sendChannel.readyState)
        sendFileSig({ 
            type: "desc",
            name: connectedFileUser,
            info: desc
        });
    }
    
    function gotDescription2(desc) {
        receiveConnection.setLocalDescription(desc);
        sendFileSig({ 
            type: "desc",
            name: connectedFileUser,
            info: desc
        });
    }
    
    function onAddIceCandidateSuccess() {
        console.log('AddIceCandidate success.');
    }
    
    function onAddIceCandidateError(error) {
        console.log('Failed to add Ice Candidate: ' + error.toString());
    }
    
    function receiveChannelCallback(event) {
        console.log('Receive Channel Callback');
        receiveChannel = event.channel;
        receiveChannel.binaryType = 'arraybuffer';
        receiveChannel.onmessage = onReceiveMessageCallback;
        receiveChannel.onopen = onReceiveChannelStateChange;
        receiveChannel.onclose = onReceiveChannelStateChange;
        console.log(receiveChannel.readyState);
        receivedSize = 0;
        bitrateMax = 0;
        downloadAnchor.textContent = '';
        downloadAnchor.removeAttribute('download');
        if (downloadAnchor.href) {
            URL.revokeObjectURL(downloadAnchor.href);
            downloadAnchor.removeAttribute('href');
        }
    }
    
    function onReceiveMessageCallback(event) {
        // console.log('Received Message ' + event.data.byteLength);
        receiveBuffer.push(event.data);
        receivedSize += event.data.byteLength;
        receiveProgress.value = receivedSize;
    
        // we are assuming that our signaling protocol told
        // about the expected file size (and name, hash, etc).
        var file_name = destuser.file_name;
        var file_size = destuser.file_size;
        if (receivedSize === file_size) {
            var received = new window.Blob(receiveBuffer);
            receiveBuffer = [];
    
            downloadAnchor.href = URL.createObjectURL(received);
            downloadAnchor.download = file_name;
            downloadAnchor.textContent =
            'Click to download \'' + file_name + '\' (' + file_size + ' bytes)';
            downloadAnchor.style.display = 'block';
            console.log(receivedSize * 8);
            console.log((new Date()).getTime() - timestampStart);
            var bitrate = Math.round(receivedSize * 8 /
                ((new Date()).getTime() - timestampStart));
            bitrateDiv.innerHTML = '<strong>Average Bitrate:</strong> ' +
            bitrate + ' kbits/sec';
    
            if (statsInterval) {
                window.clearInterval(statsInterval);
                statsInterval = null;
            }
    
            closeDataChannels();
            alertify.success('Finish receiving, please click the link to download.');
        }
    }
    
    function onSendChannelStateChange() {
        var readyState = sendChannel.readyState;
        console.log('Send channel state is: ' + readyState);
        if (readyState === 'open') {
            sendData();
            sendProgress.value = 0;
        } else if (readyState === 'closed') {
            closeDataChannels();
            alertify.success('Finish sending .');
        }
    }
    
    function onReceiveChannelStateChange() {
        var readyState = receiveChannel.readyState;
        console.log('Receive channel state is: ' + readyState);
        if (readyState === 'open') {
            receiveProgress.value = 0;
            timestampStart = (new Date()).getTime();
            timestampPrev = timestampStart;
            statsInterval = window.setInterval(displayStats, 500);
            window.setTimeout(displayStats, 100);
            window.setTimeout(displayStats, 300);
        }
    }
    
    // display bitrate statistics.
    function displayStats() {
        var display = function(bitrate) {
            bitrateDiv.innerHTML = '<strong>Current Bitrate:</strong> ' +
                bitrate + ' kbits/sec';
        };
        
        if (receiveConnection && receiveConnection.iceConnectionState === 'connected') {
            if (adapter.browserDetails.browser === 'chrome') {
                // TODO: once https://code.google.com/p/webrtc/issues/detail?id=4321
                // lands those stats should be preferrred over the connection stats.
                receiveConnection.getStats(null, function(stats) {
                    for (var key in stats) {
                        var res = stats[key];
                        if (timestampPrev === res.timestamp) {
                            return;
                        }
                        if (res.type === 'googCandidatePair' &&
                            res.googActiveConnection === 'true') {
                            // calculate current bitrate
                            var bytesNow = res.bytesReceived;
                            var bitrate = Math.round((bytesNow - bytesPrev) * 8 /
                                (res.timestamp - timestampPrev));
                            display(bitrate);
                            timestampPrev = res.timestamp;
                            bytesPrev = bytesNow;
                            if (bitrate > bitrateMax) {
                                bitrateMax = bitrate;
                            }
                        }
                    }
                });
            } else {
                // Firefox currently does not have data channel stats. See
                // https://bugzilla.mozilla.org/show_bug.cgi?id=1136832
                // Instead, the bitrate is calculated based on the number of
                // bytes received.
                var bytesNow = receivedSize;
                var now = (new Date()).getTime();
                var bitrate = Math.round((bytesNow - bytesPrev) * 8 /
                    (now - timestampPrev));
                display(bitrate);
                timestampPrev = now;
                bytesPrev = bytesNow;
                if (bitrate > bitrateMax) {
                    bitrateMax = bitrate;
                }
            }
        }
    }
});
