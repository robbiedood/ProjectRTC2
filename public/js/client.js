(function(){
	var app = angular.module('projectRTC2', [],
		function($locationProvider){$locationProvider.html5Mode(true);}
    	); // claim a agular app, corresponds to <html ng-app="projectRtc"> in index.ejs
	var client = new PeerManager(); // PeerManager is a function defined in rtcClient.js
	var mediaConfig = {
        	audio: true,
        	video: false
    	}; // mediaConfig defines media type

    // create an angular service using factory
    	app.factory('camera', ['$rootScope', '$window', function($rootScope, $window){

		var camera = {};
		
		camera.preview = $window.document.getElementById('localVideo'); // set privew to localVideo div
    		camera.isOn = null;
		
		camera.start = function(){
            	return navigator.mediaDevices.getUserMedia(mediaConfig)
            .then(gotStream)
            .catch(function(e) {
              alert('getUserMedia() error: ' + e.name);});
          	};
      
		function gotStream(stream){	
			camera.preview.srcObject = stream; //attach Media to camera.preview, which cooresponds to localVideo div
			client.setLocalStream(stream);  // setLocalStream for PeerManager
			camera.stream = stream;		// keep stream in camera.stream
			camera.isOn = true;
			$rootScope.$broadcast('cameraIsOn',true);  //broacast the success of getting Media from local
		}

		camera.stop = function(){
			return new Promise(function(resolve, reject){			
					try {
						//camera.stream.stop() no longer works for Chrome 45+ version (after 2015)
						camera.stream.getTracks().forEach(function(track){track.stop()});
						camera.preview.src = ''; // clean localVideo src
						resolve();
					} catch(error) {
						reject(error);
					}
			})
			.then(function(result){
				$rootScope.$broadcast('cameraIsOn',false); //broacast the stop of getting Media from local
				camera.isOn = false;
			});	
			};
		return camera;
	}]);

	app.controller('RemoteStreamsController', ['camera', '$location', '$http', function(camera, $location, $http){
		var rtc = this;
		rtc.remoteStreams = [];
		function getStreamById(id) {
		    for(var i=0; i<rtc.remoteStreams.length;i++) {
		    	if (rtc.remoteStreams[i].id === id) {return rtc.remoteStreams[i];}
		    }
		}
		rtc.loadData = function () {
			// For angular 1.6.0+; get list of streams from the server
			$http.get('/streams.json').then(function(res){
				// filter own (local) stream, only keep remote stream
				var streams = res.data.filter(function(stream) {
			      	return stream.id != client.getId();
			    	});
			    // get former playing state
			    for(var i=0; i<streams.length;i++) {
			    	var stream = getStreamById(streams[i].id);
			    	streams[i].isPlaying = (!!stream) ? stream.isPLaying : false;
			    }
			    // save new streams
			    rtc.remoteStreams = streams;
			}, function(error){
				console.log('http get streams json error');
			});
		};

		// rtc.view = function(stream){
		// 	client.peerInit(stream.id);
		// 	stream.isPlaying = !stream.isPlaying; //turn play to stop, stop to play (state swichting)
		// };

		rtc.call = function(stream){
			/* If json isn't loaded yet, construct a new stream 
			 * This happens when you load <serverUrl>/<socketId> : 
			 * it calls socketId immediatly.
			**/
			if(!stream.id){
				stream = {id: stream, isPlaying: false};
				rtc.remoteStreams.push(stream); // push the (new) stream into stream list
			}
			
			if(camera.isOn){ 
				client.toggleLocalStream(stream.id);
				if(stream.isPlaying){
					client.peerRenegociate(stream.id);
				} else {
					client.peerInit(stream.id);
				}
				stream.isPlaying = !stream.isPlaying;
			} else {
				camera.start()
				.then(function(result) {
					client.toggleLocalStream(stream.id);
					if(stream.isPlaying){
						client.peerRenegociate(stream.id);
					} else {
						client.peerInit(stream.id);
					}
					stream.isPlaying = !stream.isPlaying;
				})
				.catch(function(err) {
					console.log(err);
				});
			}
		};

		//initial load
		rtc.loadData();
		if($location.url() != '/'){
			rtc.call($location.url().slice(1));  //call remote host by remote host id
		};
	}]);

	app.controller('LocalStreamController',['camera', '$scope', '$window', function(camera, $scope, $window){
		var localStream = this;
		localStream.name = 'Guest';
		localStream.link = '';
		localStream.cameraIsOn = false;

		$scope.$on('cameraIsOn', function(event, data) {
			$scope.$apply(function() {
				localStream.cameraIsOn = data;
			});
		});

		localStream.toggleCam = function(){
			if(localStream.cameraIsOn){
				camera.stop()
				.then(function(result){
					client.send('leave');
	    				client.setLocalStream(null);
				})
				.catch(function(err) {
					console.log(err);
				});
			} else {
				camera.start()
				.then(function(result) {
					client.send('readyToStream', { name: localStream.name });
				})
				.catch(function(err) {
					console.log(err);
				});
				localStream.link = 'http://' + $window.location.host + '/' + client.getId(); // putting the line into .then would have bug, why ?
				console.log(localStream.link); //this is for deug android using desktop
			}
		};
	}]);
})(); // the ending () = call the function by itself
