'use strict';

//////// Basic Module Loading ///////////
var express = require('express')
, path = require('path')
, favicon = require('serve-favicon')
, bodyParser = require('body-parser');

//////// Express Setup /////////////////

var app = express();
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.use(favicon(__dirname + '/public/images/favicon.ico'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var server = app.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

var io = require('socket.io')(server);

// generate a custom id using secure method (crypto module) for better user experience
io.engine.generateId = function (req) {
  var crypto = require("crypto");
  var customId = crypto.randomBytes(20).toString('hex').substr(2, 4);
  return customId
}

var streams = require('./server/streamList.js')();

require('./server/routes.js')(app, streams); // routing
require('./server/socketHandler.js')(io, streams); // socket.io module
