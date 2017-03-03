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
    var vmUserList = new Vue({
        el: '#user-list',
        data: {
            users: []
        }
    });
    console.log("hello");
    var ws = new WebSocket('wss://10.205.43.19:3000/ws/chat');

    ws.onopen = function(){
        console.log("connected");
        ws.send(JSON.stringify({
            type: 'login',
            name: getAttri(document.cookie, 'name=', ';')
        }));

        startConnection();
    }
    
    ws.onmessage = function(event) {
        var data = event.data;
        console.log(data);
        var msg = JSON.parse(data);
        switch (msg.type ) {
            case 'list':
                vmUserList.users = msg.data;
                break;
            case 'join':
                addToUserList(vmUserList.users, msg.user);
                addMessage(vmMessageList.messages, msg);
                break;
            case 'left':
                removeFromUserList(vmUserList.users, msg.user);
                addMessage(vmMessageList.messages, msg);
                break;
            case 'chat':
                addMessage(vmMessageList.messages, msg);
            break;
            case 'login':
                onLogin(msg.success);
                break;
            case 'offer':
                onOffer(msg.offer, msg.name);
                break;
            case 'answer':
                onAnswer(msg.answer);
                break;
            case 'candidate':
                onCandidate(msg.candidate);
                break;
            case 'leave':
                onLeave();
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
        console.log('[chat] ' + text);
        if (text) {
            input.val('');
            ws.send(JSON.stringify(text));
        }
    });
    
    //WebRTC
    let theirUsernameInput = document.querySelector('#their-username'),
        callButton = document.querySelector('#call'),
        hangUpButton = document.querySelector('#hang-up');

    function send(message){
        if(connectedUser){
            message.name = connectedUser;
        }

        ws.send(JSON.stringify(message));
    };

    callButton.addEventListener("click", function () { 
        var theirUsername = theirUsernameInput.value;

        if (theirUsername.length > 0) { 
            startPeerConnection(theirUsername); 
        }
    });

    hangUpButton.addEventListener("click", function () {
        send({ 
            type: "leave" 
        });

        onLeave(); 
    });

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
            alert("An error has occurred"); 
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

    var yourVideo = document.querySelector('#yours'),
        theirVideo = document.querySelector('#theirs'),
        yourConnection, connectedUser, stream;

    function startConnection() {
        if(hasUserMedia()) {
            navigator.getUserMedia ({video: true, audio: true}, 
            function(myStream) {
                stream = myStream;
                yourVideo.src = window.URL.createObjectURL(stream);
                
                if(hasRTCPeerConnection()) {
                    setupPeerConnection(stream);
                } else {
                    alert("Sorry, your browser does not support WebRTC.");
                }
            }, 
            function (error) {
                console.log(error);
            });
        } else {
            alert("Sorry, your browser does not support WebRTC.");
        }
    }

    function setupPeerConnection(stream) {
        var configuration = {
            "iceServers": [{"url":"stun:stun.l.google.com:19302"}]
        };

        yourConnection = new RTCPeerConnection(configuration);

        yourConnection.addStream(stream);
        yourConnection.onaddstream = function(e) {
            theirVideo.src = window.URL.createObjectURL(e.stream);
        }

        yourConnection.onicecandidate = function(event) {
            if(event.candidate) {
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
            alert("An error has occurred."); 
        }); 
    };
});