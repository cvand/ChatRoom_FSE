var sqlite3 = require('sqlite3').verbose();
var fs = require("fs");
var file = "chatdb.db";
var exists = fs.existsSync(file);

var db = new sqlite3.Database(file);

db.serialize(function() {
	  if(!exists) {
	    // create database schema
	    db.run("CREATE TABLE IF NOT EXISTS user (" +
	    		"name TEXT NOT NULL," +
	    		"sessionId TEXT NOT NULL)");
	    
	    db.run("CREATE TABLE IF NOT EXISTS chat_message (" +
	    		"message TEXT NOT NULL, " +
	    		"date_created DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, " +
	    		"user_name TEXT NOT NULL)");
	  }
	});


db.close();