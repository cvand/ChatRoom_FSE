/*
 * Module dependencies: - Express - Http (to run Express) - Body parser (to
 * parse JSON requests) - Underscore (because it's cool) - Socket.IO(Note: we
 * need a web server to attach Socket.IO to)
 * 
 * It is a common practice to name the variables after the module name. Ex: http
 * is the "http" module, express is the "express" module, etc. The only
 * exception is Underscore, where we use, conveniently, an underscore. Oh, and
 * "socket.io" is simply called io. Seriously, the rest should be named after
 * its module name.
 * 
 */
var express = require("express");
var app = express();
var http = require("http").Server(app);
var bodyParser = require("body-parser");
var io = require("socket.io")(http);
var _ = require("underscore");
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('chatdb.db');

/*
 * The list of participants in our chatroom. The format of each participant will
 * be: { id: "sessionId", name: "participantName" }
 */
var participants = [];

/* Server config */

// Server's IP address
app.set("ipaddr", "127.0.0.1");

// Server's port number
app.set("port", 8080);

// View engine is Jade
app.set("view engine", "jade");
app.use(express.static(process.cwd() + '/public'));

// Tells server to support JSON requests
app.use(bodyParser.json());

/* Server routing */

// Handle route "GET /"
app.get("/", function(request, response) {

	
	
	// Render the view called "index"
	response.render("index");

});

// Handle route "GET /chat"
app.get("/chat", function(request, response) {
	response.render('view', {pageData: {messages : [{name: 'name 1', date: "2015-12-2 12:20", text: "this is a message"}, {name: 'name 2', date: "2015-12-2 12:23", text: "this is another message"}], participants : participants}});
});

// POST method to create a chat message
app.post("/message", function(request, response) {

	// The request body expects a param named "message"
	var message = request.body.message;

	// If the message is empty or wasn't sent it's a bad request
	if (_.isUndefined(message) || _.isEmpty(message.trim())) { return response.json(400, {
		error: "Message is invalid"
	}); }

	// We also expect the sender's name with the message
	var name = request.body.name;

	// Let our chatroom know there was a new message
	io.sockets.emit("incomingMessage", {
		message: message,
		name: name
	});

	// Looks good, let the client know
	response.status(200).json({
		message: "Message received"
	})

});

io.on('connection', function(socket) {
	/*
	 * When a new user connects to our server, we expect an event called
	 * "newUser" and then we'll emit an event called "newConnection" with a list
	 * of all participants to all connected clients
	 */
	socket.on("newUser", function(data) {
		var participant = _.findWhere(participants, {
			name: data.name
		});
		var socket_id = socket.id.replace("/#", "");

		 if (participant != undefined) {
			 // there's an existing user with the same name
			 io.sockets.emit("existingUserError", {
				 socket: socket_id,
				 message: "A user with the name " + data.name + " is already logged in the chat room. Please choose a different name."
			 });
		 } else {
			participants.push({
				id: data.id,
				name: data.name
			});
			saveUser(data.name, data.id);
			io.sockets.emit("newConnection", {
				participants: participants
			});
			
			getUser(socket_id, function(user) {
				console.log(user);
			});
		 }
	});

	/*
	 * When a user changes his name, we are expecting an event called
	 * "nameChange" and then we'll emit an event called "nameChanged" to all
	 * participants with the id and new name of the user who emitted the
	 * original message
	 */
	socket.on("nameChange", function(data) {
		var socket_id = socket.id.replace("/#", "");
		var participant = _.findWhere(participants, {
			id: socket_id
		});

		if (participant != undefined) {
			participants = _.without(participants, participant);
			participant.name = data.name;
			participants.push(participant);
		}
		io.sockets.emit("nameChanged", participant);
	});

	/*
	 * When a client disconnects from the server, the event "disconnect" is
	 * automatically captured by the server. It will then emit an event called
	 * "userDisconnected" to all participants with the id of the client that
	 * disconnected
	 */
	socket.on("disconnect", function() {
		console.log("---- disconnect ----");
		var socket_id = socket.id.replace("/#", "");
		console.log(socket_id);
		var part = _.findWhere(participants, {
			id: socket_id
		});
		participants = _.without(participants, part);
		io.sockets.emit("userDisconnected", {
			id: socket.id,
			sender: "system"
		});
	});
});

// Start the http server at port and IP defined before
http.listen(app.get("port"), app.get("ipaddr"), function() {
	console.log("Server up and running. Go to http://" + app.get("ipaddr") + ":" + app.get("port"));
});

function saveUser(name, session_id) {
	db.run("INSERT INTO user VALUES (\"" + name + "\", \"" + session_id + "\")");
}

function removeUser(session_id) {
	db.run("DELETE * from user where sessionId = \"" + session_id + "\"");
}

function getUser(session_id, callback) {
	db.all("SELECT * FROM user where sessionId = \"" + session_id + "\"", function(err,rows){
		var user = _.first(rows);
		callback(user);
	});
}

function getMessages() {
	db.all("SELECT * FROM chat_message order by date_created asc", function(err,rows){
		console.log(rows);
	});
}

function saveMessage(session_id, message) {
	var user;
	db.all("SELECT * FROM user where sessionId = \"" + session_id + "\"", function(err,rows){
		console.log(rows);
	//	db.run("INSERT INTO 'chatdb'.'chat_message' ('message', 'user_id') VALUES (" + message + ", " + user.id + ")");
	});
}