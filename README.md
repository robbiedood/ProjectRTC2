# ProjectRTC2
The ProjectRTC 2 : WebRTC Live Streaming Cross-platform on NodeJS 

We rennovate [ProjectRTC] (https://github.com/pchab/ProjectRTC.git) by means of
incorporating adapter-latest, upgrading ejs, socket.io and angularjs to the latest version(s) for a better security and
streaming performance. Depreciation modules of WebRTC are also replaced with official suggestions.

## Install

It requires 
- [node.js](http://nodejs.org/download/)
- [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- stun/turn: a free google stun server is included; but you would need a turn server such as installing [coturn](https://github.com/coturn/coturn) on AWS or GCP instance for better traversal using relays around NAT. 

* git clone https://github.com/lukelu0520/ProjectRTC2.git
* cd ProjectRTC2/
* npm install
* node server.js

The server will run on port 3000
You can test it in the (Chrome or Firefox) browser at localhost:3000


## Features

- Node.js server
- Broswer (Chrome or Firefox) client
- [Android App client](https://github.com/lukelu0520/AndroidRTC2) (AndroidRTC2)
- The signaling part is done with [socket.io 3](socket.io)
- coturn and google stun are tested for stun/turn


## Author

- [Luke Tourmato](mailto:chienlu@alumni.princeton.edu)