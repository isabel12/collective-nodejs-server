var express = require("express");
var mongoose = require ("mongoose"); 
var fs = require("fs");
var models = require('./models');
var User, LoginToken;


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


// Define the User object
//----------------------------------------------------------------------------

// This is the schema.  Note the types, validation and trim
// statements.  They enforce useful constraints on the data.
var userSchema = new mongoose.Schema({
  name: {
    first: String,
    last: { type: String, trim: true }
  },
  age: { type: Number, min: 0}
});

// Compiles the schema into a model, opening (or creating, if
// nonexistent) the 'PowerUsers' collection in the MongoDB database
var PUser = mongoose.model('PowerUsers', userSchema);

//----------------------------------------------------------------------------


// setup the models
models.defineModels(mongoose, function() {
  User = mongoose.model('User');
  LoginToken = mongoose.model('LoginToken');
})









// The API end points
//--------------------------------------------------------------------------------------------------------------
var errorFunction = function(err){if (err) console.log('Error on save!')};



app.get('/createToken/:id', function(request, response){

	var newToken = new LoginToken({userId: request.params.id});

	newToken.save(errorFunction);

	response.send('success!');

});

app.get('/getAllTokens', function(request, response){


	LoginToken.find(function (err, tokens) {
	  if (err){
	  	response.send(500);
	  }

	  response.send(tokens);
	})

});



//
// eg.  Content-Type: application/json
//      {"name":{"first":"isabel",  "last":"Broome-Nicholson"},"age":25}
//
// POST '/user'
// creates a user, and returns them
app.post('/user', function(request, response){

	// read the values of the post body
	var firstname = request.body.name.first;
	var lastname = request.body.name.last;
	var age = request.body.age;

	// create a new user 
	var newUser = new PUser ({
		name: { first: firstname, last: lastname },
		age: age
	});
	
	// save them
	newUser.save(errorFunction);

	// send the response 
	response.send(newUser);  // returns it as application/json
});


// GET '/user/{id}'
// returns the user with the given id
app.get('/user/:id', function(request, response){

	var id = request.params.id;

	// define the query
	var query = PUser.findById(id);

	// execute the query
	query.exec(function(err, result) {
		if (!err){
			response.send(result); 
		}
		else {
			response.send(500, 'An error happened with the query');  // returns the error code
		}
	});
});


// GET '/user'
// returns all users
app.get('/user', function(request, response) {

	// make a query to find some users
	var query = PUser.find({'age': 25}); 
	
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