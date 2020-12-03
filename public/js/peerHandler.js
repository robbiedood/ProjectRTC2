var PeerManager = (function () {

  var localId,
      pcConfig = {
        iceServers: [
          {urls:'stun:stun.l.google.com:19302'},
          {
            urls: 'turn:34.94.159.96:3478',
            username: 'tourmato',
            credential: '1314520'
          }
        ]
      },
      peerDatabase = {},
      localStream,
      remoteVideoContainer = document.getElementById('remoteVideosContainer'),
      socket = io();
      
  socket.on('message', handleMessage);
  socket.on('id', function(id) {
    //localId = id.substring(0,4).toLowerCase();  //make localId shorter and only lower case for simplicity sharing
    localId = id;
  });
      
  function addPeer(remoteId) {
    var peer = new Peer(pcConfig);
    peer.pc.onicecandidate = function(event) {
      if (event.candidate) {
        send('candidate', remoteId, {
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          candidate: event.candidate.candidate
        });
      }
    };

    peer.pc.ontrack = function(event) {
      console.log('Remote stream added.');
      peer.remoteVideoEl.srcObject = event.streams[0];
      remoteVideosContainer.appendChild(peer.remoteVideoEl);
    };
    peer.pc.onremovestream = function(event) {
      peer.remoteVideoEl.src = '';
      remoteVideosContainer.removeChild(peer.remoteVideoEl);
    };
    peer.pc.oniceconnectionstatechange = function(event) {
      switch( (event.target).iceConnectionState ) {
        case 'disconnected':
          remoteVideosContainer.removeChild(peer.remoteVideoEl);
          break;
        case 'connected':
          console.log('we are connected!');
      }
    };
    peerDatabase[remoteId] = peer;
        
    return peer;
  }

  function answer(remoteId) {
    var pc = peerDatabase[remoteId].pc;
    pc.createAnswer(
      function(sessionDescription) {
        pc.setLocalDescription(sessionDescription);
        send('answer', remoteId, sessionDescription);
      }, 
      error
    );
  }
  function offer(remoteId) {
    var pc = peerDatabase[remoteId].pc;
    pc.createOffer(
      function(sessionDescription) {
        pc.setLocalDescription(sessionDescription);
        send('offer', remoteId, sessionDescription);
      }, 
      error
    );
  }
  function handleMessage(message) {
    var type = message.type,
        from = message.from,
        pc = (peerDatabase[from] || addPeer(from)).pc;

    console.log('received ' + type + ' from ' + from);
  
    switch (type) {
      case 'init':
        toggleLocalStream(pc);
        offer(from);
        break;
      case 'offer':
        pc.setRemoteDescription(new RTCSessionDescription(message.payload), function(){}, error);
        answer(from);
        break;
      case 'answer':
        pc.setRemoteDescription(new RTCSessionDescription(message.payload), function(){}, error);
        break;
      case 'candidate':
        if(pc.remoteDescription) {
          pc.addIceCandidate(new RTCIceCandidate({
            sdpMLineIndex: message.payload.label,
            sdpMid: message.payload.id,
            candidate: message.payload.candidate
          }), function(){}, error);
        }
        break;
    }
  }

  function send(type, to, payload) {
    console.log('sending ' + type + ' to ' + to);

    socket.emit('message', {
      to: to,
      type: type,
      payload: payload
    });
  }
  
  function toggleLocalStream(pc) { // a switcher for local stream 
    if(localStream) {
      (!!pc.getSenders().length) ? pc.removeStream(localStream) : pc.addStream(localStream);
    }
  }

  function error(err){
    console.log(err);
  }

  return {
    getId: function() {
      return localId;
    },
    
    setLocalStream: function(stream) {

      // if local cam has been stopped, remove it from all outgoing streams.
      if(!stream) {
        for(id in peerDatabase) {
          pc = peerDatabase[id].pc;
          if(!!pc.getSenders().length) {
            pc.removeStream(localStream);
            offer(id);
          }
        }
      }

      localStream = stream;
    }, 

    toggleLocalStream: function(remoteId) {
      peer = peerDatabase[remoteId] || addPeer(remoteId);
      toggleLocalStream(peer.pc);
    },
    
    peerInit: function(remoteId) {
      peer = peerDatabase[remoteId] || addPeer(remoteId);
      send('init', remoteId, null);
    },

    peerRenegociate: function(remoteId) {
      offer(remoteId);
    },

    send: function(type, payload) {
      socket.emit(type, payload);
    }
  };
  
}); //define a function called PeerManager, which manages Peer functional object defined bellow

// define a function called Peer
var Peer = function (pcConfig) {
  this.pc = new RTCPeerConnection(pcConfig);
  this.remoteVideoEl = document.createElement('video');
  //this.remoteVideoEl.controls = true;
  this.remoteVideoEl.muted = true;
  this.remoteVideoEl.autoplay = true;
}