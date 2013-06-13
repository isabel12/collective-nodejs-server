var express = require("express");
var mongoose = require ("mongoose"); 
var fs = require("fs");
var models = require('./models');
var User, LoginToken, Profile;


// find appropriate db to connect to, default to localhost
var uristring = 
process.env.MONGOLAB_URI || 
process.env.MONGOHQ_URL || 
'mongodb://localhost/HelloMongoose';

// the appropriate port, or default to 5000  
var port = process.env.PORT || 5000;


// set up the server
var app = express();
app.use(express.logger());
app.use(express.bodyParser());  // allows the app to read JSON from body
app.use(express.cookieParser());


// Makes connection asynchronously.  Mongoose will queue up database
// operations and release them when the connection is complete.
mongoose.connect(uristring, function (err, res) {
	if (err) { 
		console.log ('ERROR connecting to: ' + uristring + '. ' + err);
	} else {
		console.log ('Succeeded connected to: ' + uristring);
	}
});


// setup the models
models.defineModels(mongoose, function() {
	User = mongoose.model('User');
	LoginToken = mongoose.model('LoginToken');
	Profile = mongoose.model('RTProfile');
})


// The API end points
//--------------------------------------------------------------------------------------------------------------
var errorFunction = function(err){
	if (err) {
		console.log('Database error: ' + err);
	}
};


// This function is called before each restricted API endpoint.  It checks the session 
// is current, and saves the user's id into the request.user_id field, for easier access.
function validateSession(request, response, next){


	var sessionId = request.get('Authorization');
	console.log('sessionId received: ' + sessionId);

	// get the token
	LoginToken.findOne({'token':sessionId}, function(err, token){

		if(err){
			errorFunction(err);
			return;
		}

		if(token == null){
			response.send(401, 'Session has expired or is invalid.  Please log in again.');
			return;
		}

		token.update();
		token.save(errorFunction);

		//get the user, and put in request
		User.findById(token.userId, function(err, user){
			if(err){
				errorFunction(err);
				return;
			}

			if(user == null){
				response.send(500, 'Woops, server error.');
				return;
			}

			request.user_id = user.id;

			// continue on to the original method
			next();
		});
	});
}


app.get('/', function(request, response){


	var methods = '';
	methods += 'GET /getAllTokens <br>';
	methods += 'Test method.  Gets all active login tokens <br><br>';

	methods += 'GET /test (requires authentication) <br>';
	methods += 'Test method.  Prints a message if you have included an active session key in the \'Authorization\' header <br><br>';

	methods += 'POST /users {"email":"asder@gmail.com", "password":"123"}<br>';
	methods += 'Registers a new user <br><br>';

	methods += 'POST /login {"email":"asder@gmail.com", "password":"123"}<br>';
	methods += 'Logs the user in, returning the session.  This should be included in the \'Authorization\' header for requests requiring authentication <br><br>';

	methods += 'GET /users<br>';
	methods += 'Gets all users <br><br>';

	methods += 'GET /users/{userId}<br>';
	methods += 'Gets an individual user <br><br>';


	response.send(methods);
});



// GET '/getAllTokens'
// Helper method.  Returns all active login tokens.
app.get('/getAllTokens', function(request, response){
	LoginToken.find(function (err, tokens) {
		if (err){
			response.send(500);
		}

		response.send(tokens);
	});

});



// GET '/test'
// An example method that uses validateSession to make sure you are logged in.
app.get('/test', validateSession, function(request, response){
	response.send("Yay, you are logged in!");
});



// POST '/users'
// {
//	"email":"isabel.broomenicholson@gmail.com",
//	"password":"password",
//  "firstName": "Isabel",
// 	"lastName":"Broome-Nicholson",
//	"address": "Cool place on the hill",
//  "city": "Wellington",
//  "phone": "0211111111"
// }
//
// Allows the user to register.  Currently doesn't do anything except create a user, but can be extended to add more items later.
app.post('/users', function(request, response){

	var email = request.body.email;
	var password = request.body.password;
	var firstName = request.body

	
	User.find({'email':request.body.email}, function (err, existingUsers) {
		// if the query errors out
		if (err){
			response.send(500);
			return;
		}
 
 		// check the user doesn't exist already
		if(existingUsers.length != 0){
			console.log('An account already exists for that email.');
			response.send(403, 'An account already exists for that email.');
			return;
		}

	  	// create a new user
	  	var newUser = new User(request.body);
	  	newUser.set('password', password);
	  	newUser.save(errorFunction);
	  	console.log(JSON.stringify(newUser, undefined, 2));

	  	var profile = new Profile(newUser);
	  	profile.session = request.get('Authorization');
	  	console.log(JSON.stringify(profile, undefined, 2));

	  	// send the new user
	  	response.send(profile);
	  });
});



// POST '/login'
// {
//	"email":"isabel.broomenicholson@gmail.com",
//	"password":"password"
// }
//
// Allows the user to login.
app.post('/login', function(request, response){
	var email = request.body.email;
	var password = request.body.password;

	// get associated user
	User.findOne({'email':email}, function(err, user) {
		
		if(err){
			errorFunction(err);			
			response.send(500);
			return;
		}
		
		// check user exists, and password is valid
		var validated = (user != null) && (user.authenticate(password)); 
		if(!validated){
			response.send(401, 'Email/password combination is invalid.');
			return;
		}

		// create / update the token, and return result
		LoginToken.findOne({'userId':user._id}, function(err, token){
			if(err){
				errorFunction(err);
			}
			else {
				if(token == null) {
					token = new LoginToken({'userId':user._id});
				}
				var session = token.update();
				token.save(errorFunction);

				response.send({'session':session});
			}
		});		
	});
});


// GET '/user/{id}'
// Returns the user with the given id.
app.get('/users/:id', function(request, response){

	var id = request.params.id;

	// define the query
	var query = User.findById(id);

	// execute the query
	query.exec(function(err, result) {
		if (!err){
			var profile = new Profile(result);
	  		profile.session = request.get('Authorization');

			response.send(JSON.stringify(profile, undefined, 2)); 
		}
		else {
			response.send(500, 'An error happened with the query');  // returns the error code
		}
	});
});


// GET '/user'
// Returns all users.  Test method
app.get('/users', function(request, response) {

	// make a query to find some users
	var query = User.find();
	
	// return all the results so far
	query.exec(function(err, result) {
		if (!err){
			response.send(JSON.stringify(result, undefined, 2));
		}
		else {
			response.send(500, 'An error happened with the query');
		}
	});
});


app.listen(port, function() {
	console.log("Listening on " + port);
});