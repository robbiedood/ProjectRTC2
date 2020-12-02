'use strict';

var isChannelReady = false;
var localId;
var isInitiator = false;
var isStarted = false;
var localStream;
var pc = null;
var remoteStream;
var streamList;
var pcConfig = {
  iceServers: [
    {urls:'stun:stun.l.google.com:19302'},
    {
      urls: 'turn:34.94.159.96:3478',
      username: 'tourmato',
      credential: '1314520'
    }
  ]
};

var mediaConstraints = {
  audio: false,
  video: true
}

//////////////////////////////////////////////////////////////////////////////////////////
//////TODO(luke): when host leaves, final one client would become the host ///////////////
/////////////////////////////////////////////////////////////////////////////////////////

var room = 'foo';
// Could prompt for room name:
// room = prompt('Enter room name:');

var socket = io();

if (room !== '') {
  socket.emit('create or join', room);
  console.log('Attempted to create or join room', room);
}

socket.on('id', function(id){localId = id});

socket.on('created', function(room) {
  console.log('Created room ' + room);
  //setInitiator();
  console.log('This peer is the initiator of room ' + room + '!');
});

socket.on('join', function (room){
  console.log('Another peer made a request to join room ' + room);
  isChannelReady = true;
});

socket.on('joined', function(room) {
  console.log('joined: ' + room);
  isChannelReady = true;
});

socket.on('full', function(room) {
  console.log('Room ' + room + ' is full');
});

socket.on('log', function(array) {
  console.log.apply(console, array);
});

////////////////////////////////////////////////

function sendMessage(message) {
  console.log('Client sending message: ', message);
  socket.emit('message', message);
}

// This client receives a message
socket.on('message', function(message) {
  //setInitiator();
  checkHost();
  console.log('Client received message:', message);
  if (message === 'got local media') {
    maybeStart();
  } else if (message.type === 'offer') {
    // check if Guest and not started
    if (!isInitiator && !isStarted) {
      maybeStart();
      console.log('i am in check if Guest and not started');
    }
    pc.setRemoteDescription(new RTCSessionDescription(message));
    doAnswer();
  } else if (message.type === 'answer' && isStarted) {
    pc.setRemoteDescription(new RTCSessionDescription(message));
  } else if (message.type === 'candidate' && isStarted) {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    pc.addIceCandidate(candidate);
  } else if (message === 'bye' && isStarted) {
    handleRemoteHangup();
  }
});

////////////////////////////////////////////////////

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');

navigator.mediaDevices.getUserMedia(mediaConstraints)
.then(gotStream)
.catch(function(e) {
  alert('getUserMedia() error: ' + e.name);
});

function gotStream(stream) {
  console.log('Adding local stream.');
  localStream = stream;
  localVideo.srcObject = stream;
  sendMessage('got local media');
  checkHost();
  if (isInitiator) {
    maybeStart();
  }
}

function maybeStart() {
  console.log('>>> maybeStart(): (isStarted, isChannelReady, localStream) ', isStarted, isChannelReady, localStream);
  if (!isStarted && isChannelReady && typeof localStream !== 'undefined') {
    console.log('>>>> creating peer connection');
    createPeerConnection();
    pc.addStream(localStream);
    isStarted = true;
    if (isInitiator) { //host would call guest
      doCall();
    }
  }
}

window.onbeforeunload = function() {
  sendMessage('bye');
};


/////////////////////////////////////////////////////////

function createPeerConnection() {
  try {
    pc = new RTCPeerConnection(pcConfig);
    pc.onicecandidate = handleIceCandidate;
    pc.ontrack = handleRemoteStreamAdded;
    pc.onremovestream = handleRemoteStreamRemoved;
    console.log('Created RTCPeerConnnection');
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
    return;
  }
}

function handleIceCandidate(event) {
  //console.log('icecandidate event: ', event);
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
  } else {
    console.log('Finish of chasing ice candidates.');
  }
}

function handleCreateOfferError(event) {
  console.log('createOffer() error: ', event);
}

function doCall() {
  console.log('Sending offer to guest');
  pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

function doAnswer() {
  console.log('Sending answer to host.');
  pc.createAnswer().then(
    setLocalAndSendMessage,
    onCreateSessionDescriptionError
  );
}

function setLocalAndSendMessage(sessionDescription) {
  pc.setLocalDescription(sessionDescription);
  sendMessage(sessionDescription);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}


function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
  remoteStream = event.streams[0];
  remoteVideo.srcObject = remoteStream;
}

function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}


function handleRemoteHangup() {
  console.log('Session terminated.');
  stop();
}

function stop() {
  isStarted = false;
  pc.close();
  pc = null;
}


function checkHost(){
  $.get('/streams.json', function(data, status){
    let role = (data.find(el => el.id === localId)).name;
    isInitiator = (role == 'Host') ? true : false;
    console.log('role: ' + role + '; isInitiator: ' + isInitiator)
  });
}
