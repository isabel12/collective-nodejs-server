var express = require("express");
var mongoose = require ("mongoose"); 
var fs = require("fs");
var models = require('./models');
var User, Review, Profile;


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
	Profile = mongoose.model('RTProfile');
	Review = mongoose.model('Review');
})

// Basic Auth
var auth = express.basicAuth(function(user, pass, callback) {

	console.log('reached authentication: ' + user + ' ' + pass);

	User.findOne({'email':user}, function(err, user){
		
		if (!err){

			if (!user){
				console.log('No user exists');
				err = new Error('No user exists');
			} else {
				var authenticated =  user.authenticate(pass);
				console.log('authenticated: ' + authenticated);

				if (!authenticated){
					err = new Error('Username and password do not match');
				}

				callback(err, user);
			}
		}		
	}); 
});


var adminAuth = express.basicAuth(function(user, pass, callback) {

	console.log('reached admin authentication: ' + user + ' ' + pass);

	User.findOne({'email':user}, function(err, user){
		
		if (!err){

			if (!user){
				console.log('No user exists');
				err = new Error('No user exists');
			} else {
				var authenticated =  user.authenticate(pass);
				console.log('authenticated: ' + authenticated);

				if (!authenticated){
					err = new Error('Username and password do not match');
				}

				callback(err, user);
			}
		}		
	}); 
});



// The API end points
//--------------------------------------------------------------------------------------------------------------
var errorFunction = function(err){
	if (err) {
		console.log('Database error: ' + err);
	}
};

app.get('/', function(request, response){


	var methods = '';
	methods += 'GET /getAllTokens <br>';
	methods += 'Test method.  Gets all active login tokens <br><br>';

	methods += 'GET /test (requires authentication) <br>';
	methods += 'Test method.  Prints a message if you have included an active session key in the \'Authorization\' header <br><br>';

	methods += 'POST /users {"email":"asder@gmail.com", "password":"123"}<br>';
	methods += 'Registers a new user <br><br>';

	methods += 'GET /users<br>';
	methods += 'Gets all users <br><br>';

	methods += 'GET /users/{userId}<br>';
	methods += 'Gets an individual user <br><br>';

	response.send(methods);
});


// GET '/test'
// An example method that uses validateSession to make sure you are logged in.
app.get('/test', auth, function(request, response){
	response.send("Yay, you are logged in! : " + request.user);
});


// POST '/users'
// {
// 	"email":"isabel.broomenicholson@gmail.com",
// 	"password":"password",
//  "firstName": "Isabel",
//  "location":{
// 	 	"lat": "123.4",
// 		"lon": "123.3"
// 	},
// 	"lastName":"Broome-Nicholson",
// 	"address": "Cool place on the hill",
//  "city": "Wellington",
//  "phone": "0211111111"
// }
//
// Allows the user to register.  
app.post('/users', function(request, response){

	// validate the location
	var location = request.body.location;
	if (location.lat < -90 || location.lat > 90 || location.lon < -180 || location.lon > 180){
		response.send(400, "Invalid location.");
		return;
	}

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
	  	newUser.set('password', request.body.password);
	  	newUser.save(errorFunction);
	  	console.log(JSON.stringify(newUser, undefined, 2));

		// make the object to return
	  	var profile = new Profile(newUser);
	  	profile.session = request.get('Authorization');
	  	console.log(JSON.stringify(profile, undefined, 2));

	  	// send the new user
	  	response.send(profile);
	  });
});


// GET '/user/{id}'
// Returns the profile of the user with the given id.
app.get('/users/:id', auth, function(request, response){

	// find the user
	var query = User.findById(request.params.id, function(err, user) {

		if (!err){
			console.log(JSON.stringify(user, undefined, 2));

			var profile = new Profile(user);
			profile.rating = user.rating;

			console.log('rating: ' + user.rating);
			response.send(JSON.stringify(profile, undefined, 2)); 		
		}
		else {
			response.send(500, 'An error happened with the query');  // returns the error code
		}
	});
});


// {
//    "score": 5,
//    "message": "Awesome trade",
// 	  "tradeId": "234dlsdkfs23"
// }
// POST 
app.post('/users/:id/review', auth, function(request, response){

	// validate data
	if (request.body.score < 0 || request.body.score > 5){
		response.send(400, 'Score must be between 0 and 5');
		return;  
	}

	// get the reviewee id
	var revieweeId = request.params.id;

	// define the query
	var query = User.findById(revieweeId, function(err, reviewee) {
		if (!err){

			console.log(JSON.stringify(request.body, undefined, 2));

			// make the review
			var review = new Review(request.body);
			review.date = new Date();
			review.reviewer = {'firstName':request.user.firstName, 'lastName': request.user.lastName, 'userId': request.user._id };	
			review.save(errorFunction);

			console.log(JSON.stringify(review, undefined, 2));
			// TODO - check the review is legal (ie. they both belong to the trade, and they haven't reviewed it yet)


			// add the review
			reviewee.reviews.push(review);
			reviewee.save();
			response.send(201, JSON.stringify(reviewee, undefined, 2));
		}
		else {
			response.send(500, 'An error happened with the query');  
		}
	});
});


// GET '/user'
// Returns all users.  Test method
app.get('/users', adminAuth, function(request, response) {

	// make a query to find some users
	var query = User.find(function(err, result) {
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