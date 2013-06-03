var express = require("express");
var mongoose = require ("mongoose"); 

// find appropriate db to connect to, default to localhost
var uristring = 
  process.env.MONGOLAB_URI || 
  process.env.MONGOHQ_URL || 
  'mongodb://localhost/HelloMongoose';

// the appropriate port, or default to 5000  
var port = process.env.PORT || 5000;

// Makes connection asynchronously.  Mongoose will queue up database
// operations and release them when the connection is complete.
mongoose.connect(uristring, function (err, res) {
  if (err) { 
    console.log ('ERROR connecting to: ' + uristring + '. ' + err);
  } else {
    console.log ('Succeeded connected to: ' + uristring);
  }
});

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


// The webpages
//-----------------------
var app = express();
app.use(express.logger());

// GET '/'
app.get('/', function(request, response){
	response.send('options are: ' + uristring + '/AddPerson or ' + uristring + '/GetPeople' );
});


// GET '/GetPeople'
app.get('/GetPeople', function(request, response) {

	// make a query to find some users
	var query = PUser.find({'name.last': 'Doe'}); 
	query.where('age').gt(24);
	
	// return all the results so far
	query.exec(function(err, result) {
		if (!err){
			response.send(JSON.stringify(result, undefined, 2));
		}
		else {
			response.send('An error happened with the query');
		}
	});
});

// GET '/AddPerson'   <--- could be post
app.get('/AddPerson', function(request, response){
	// create a new user
	var johndoe = new PUser ({
		name: { first: 'John', last: '  Doe   ' },
		age: 25
	});
	
	// save them
	johndoe.save(function (err) {if (err) console.log('Error on save!')});
	
	// return response
	response.send('Successfully added a new person!' );
});




app.listen(port, function() {
  console.log("Listening on " + port);
});