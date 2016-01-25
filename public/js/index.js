var serverBaseUrl = document.domain;
var socket;
var sessionId = '';
var sessionName = '';

function init() {

	socket = io();

	/*
	 * When the client successfully connects to the server, an event "connect"
	 * is emitted. Let's get the session ID and log it. Also, let the socket.IO
	 * server there's a new user with a session ID and a name. We'll emit the
	 * "newUser" event for that.
	 */
	socket.on('connect', function() {
		sessionId = socket.io.engine.id;
	});

	/*
	 * When the server emits the "newConnection" event, we'll reset the
	 * participants section and display the connected clients. Note we are
	 * assigning the sessionId as the span ID.
	 */
	socket.on('newConnection', function(data) {
		updateParticipants(data.participants);
	});

	/*
	 * When the server emits the "userDisconnected" event, we'll remove the span
	 * element from the participants element
	 */
	socket.on('userDisconnected', function(data) {
		$('#' + data.id).remove();
	});

	/*
	 * When the server fires the "nameChanged" event, it means we must update
	 * the span with the given ID accordingly
	 */
	socket.on('nameChanged', function(data) {
		$('#' + data.id).html(data.name);
	});

	/*
	 * When receiving a new chat message with the "incomingMessage" event, we'll
	 * prepend it to the messages section
	 */
	socket.on('incomingMessage', function(data) {
		var message = data.message;
		var name = data.name;
		var date = data.date;
		
		var msg_box = $('<div></div').addClass('message-box');
		var header = $('<div></div>').addClass('message-box-header');
		var user_div = $('<div></div').addClass('inline-block w-8');
		var span = $('<span></span>').html(name);
		user_div.append(span);
		
		var date_div = $('<div></div').addClass('message-date w-4');
		span = $('<span></span>').html(date);
		date_div.append(span);
		
		header.append(user_div).append(date_div);
		
		var msg_div = $('<div></div').addClass('message-box-body');
		span = $('<span></span>').html(message).addClass('message-text');
		msg_div.append(span);
		
		msg_box.append(header).append(msg_div);
		
		
		$('#messages').append(msg_box);
		$("#messages").animate({ scrollTop: $('#messages').prop("scrollHeight")}, 1000);
	});

	/*
	 * Log an error if unable to connect to server
	 */
	socket.on('error', function(reason) {
		console.log('Unable to connect to server', reason);
	});

	/*
	 * Show an error message if a user exists in the chat room with the same
	 * name
	 */
	socket.on('existingUserError', function(data) {
		if (data.socket == sessionId) {
			$('#content').remove();
			alert(data.message);
			window.location.href = "/";
		}
	});

	/* Elements setup */
	$('body').bind('beforeunload', disconnect);
	$('#name').bind('keydown', enterChatKeyDown);
	$("#name").focus();
}

// Helper function to update the participants' list
function updateParticipants(participants) {
	$('#participants-list').empty();
	for (var i = 0; i < participants.length; i++) {
		var element = $('<li>' + participants[i].name + '</li>').addClass('list-group-item').attr('id', participants[i].sessionId);
		if (participants[i].sessionId === sessionId) {
			element.addClass('active');
		}
		$('#participants-list').append(element);
		
//		$('#participants-list').append(
//						'<li id="' + participants[i].sessionId + '" class="list-group-item">' + participants[i].name + ' '
//										+ (participants[i].sessionId === sessionId ? '(You)' : '') + '</li>');
	}
}

/*
 * "sendMessage" will do a simple ajax POST call to our server with whatever
 * message we have in our textarea
 */
function sendMessage() {
	var outgoingMessage = $('#outgoingMessage').val();
	var name = sessionName;
	$.ajax({
		url: '/message',
		type: 'POST',
		contentType: 'application/json',
		dataType: 'json',
		data: JSON.stringify({
			message: outgoingMessage,
			name: name
		})
	});
}

/*
 * If user presses Enter key on textarea, call sendMessage if there is
 * something to share
 */
function outgoingMessageKeyDown(event) {
	if (event.which == 13) {
		event.preventDefault();
		if ($('#outgoingMessage').val().trim().length <= 0) { return; }
		sendMessage();
		$('#outgoingMessage').val('');
	}
}

/*
 * Helper function to disable/enable Send button
 */
function outgoingMessageKeyUp() {
	var outgoingMessageValue = $('#outgoingMessage').val();
	$('#send').attr('disabled', (outgoingMessageValue.trim()).length > 0 ? false : true);
}

function enterChatKeyDown(event) {
	if (event.which == 13) {
		event.preventDefault();
		if ($('#name').val().trim().length <= 0) { return; }
		enter_chat();
		$('#name').val('');
	}
}


function enter_chat() {
	if (register_new_user()) {
		load_chat();
	}
}

function register_new_user() {
	var name = $('#name').val();
	if (name == '') {
		alert("Please enter a name to enter the chat.");
		return false;
	}
	sessionName = name;
	socket.emit('newUser', {
		id: sessionId,
		name: $('#name').val()
	});
	return true;
}

function load_chat() {
	$.ajax({
		url: '/chat',
		type: 'GET',
		contentType: 'text/html',
		success: function(data) {
			$('#login-container').remove();
			$('#content').append(data);
			
			var exit_link = $('<li><a href="javascript:void(0);" onclick="exit_chat()">Exit</a></li>');
			$('#actions-navbar').append(exit_link);
			
			$('#participants-list').children().each(function(item) {
				var element = $(this);
				if (element.attr('id') === sessionId) {
					element.addClass('active');
				}
			});
			
			$("#messages").animate({ scrollTop: $('#messages').prop("scrollHeight")}, 1000);
			$("#outgoingMessage").focus();
			
			$('#outgoingMessage').on('keydown', outgoingMessageKeyDown);
			$('#outgoingMessage').on('keyup', outgoingMessageKeyUp);
//			$('#exit-chat').on('click', exit_chat);
			$('#send').on('click', sendMessage);
		}
	});
}

function exit_chat() {
	disconnect();
	window.location.href = "/";
}

function disconnect() {
	console.log('Disconnect ' + sessionId);
	socket.emit('disconnect', {});
}

$(document).on('ready', init);
