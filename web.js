var express = require("express");
var mongoose = require ("mongoose"); 
var fs = require("fs");
var path = require("path");

var models = require('./models');
var jsonValidation = require('./jsonValidation');
var User, Review, Profile, Resource, ProfileUpdate;  // mongoose schemas
var UpdateProfileSchema, RegisterProfileSchema, validateJSON;// validation schemas


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
	ProfileUpdate = mongoose.model('ProfileUpdate');
	Resource = mongoose.model('Resource');
})

// import the validation schemas
UpdateProfileSchema = jsonValidation.UpdateProfileSchema;
RegisterProfileSchema = jsonValidation.RegisterProfileSchema;
validateJSON = jsonValidation.validateJSON;

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

// admin authentication for test methods
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
	response.send('See <a href="https://github.com/isabel12/collective-nodejs-server/blob/master/README.md"> here </a> for API details');
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
// 	"lastName":"Broome-Nicholson",
//  "location":{
// 	 	"lat": 13.4,
// 		"lon": 123.3
// 	},
// 	"address": "Cool place on the hill",
//  "city": "Wellington",
// 	"postcode":"6021"
// }

// Allows the user to register.  
app.post('/users', function(request, response){

	// tidy up input
	var body = request.body;
	body.email = body.email.trim().toLowerCase();
	body.city = body.city.trim().toTitleCase();
	body.postcode = body.postcode.trim();
	body.firstName = body.firstName.trim().capitalize();
	body.lastName = body.lastName.trim().capitalize();

	// validate input
	var validationMessage = validateJSON(body, RegisterProfileSchema);
	if (validationMessage){
		console.log("Validation failed: " + validationMessage);
		response.send(400, validationMessage);
		return;
	}

	// create the account
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
	  	var newUser = new User(body);
	  	newUser.points = 0;
	  	newUser.set('password', body.password);
	  	newUser.save(errorFunction);
	  	console.log('New user created: ' + JSON.stringify(newUser, undefined, 2));

		// make the object to return
	  	var profile = new Profile(newUser);
	  	profile.rating = 0;
	  	console.log('Returning: ' + JSON.stringify(profile, undefined, 2));

	  	// send the new user
	  	response.send(201, profile);
	  });
});





// GET '/user/{id}'
// Returns the profile of the user with the given id.
app.get('/users/:id', auth, function(request, response){

	// find the user
	var query = User.findById(request.params.id, function(err, user) {

		if (!err){
			console.log(JSON.stringify(user, undefined, 2));
			if (!user){
				response.send(404, 'That user does not exist.');
			}


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



// PUT '/user/{id}'
// {
//  "firstName": "Isabel",
// 	"lastName":"Broome-Nicholson",
 // "location":{
	//  	"lat": 13.4,
	// 	"lon": 123.3
	// },
// 	"address": "Cool place on the hill",
//  "city": "Wellington",
// 	"postcode":"6021"
// }
//
// Updates the given profile.  The JSON passed to the method can have as many or few of the required fields - the method will update
// with the ones given.  The value of each field is validated, and only the fields that are allowed to be changed will be changed; 
// all other fields will be ignored.
//
//
app.put('/users/:id', auth, function(request, response){
	// check it is your profile
	if (request.params.id != request.user._id){
		response.send(403, "You cannot edit a profile that is not yours.");
		return;
	}

	// tidy up input
	var body = request.body;
	body.city = body.city.trim().toTitleCase();
	body.postcode = body.postcode.trim();
	body.firstName = body.firstName.trim().capitalize();
	body.lastName = body.lastName.trim().capitalize();

	// validate input
	var validationMessage = validateJSON(body, UpdateProfileSchema);
	if (validationMessage){
		response.send(400, validationMessage);
		return;
	}

	// form update arguments
	var updateArguments = new ProfileUpdate(body).getFieldsExcludingId();

	// update
	User.update({'_id': request.params.id}, updateArguments, function(err, numberAffected, raw){
		if(!err){
			// check the user existed
			if(numberAffected == 0){
				response.send(404, 'That user does not exist.');
				return;
			}

			// send the updated profile back
  			User.findById(request.user._id, function(err, user){
  				if (!err){
  					var profile = new Profile(user);
					profile.rating = user.rating;
					response.send(200, JSON.stringify(profile, undefined, 2));
  				}
  				else {
  					response.send(500, 'An error happened with the query');  
  				}
  			});	
  		} else {
  			response.send(500, 'An error happened with the query');  
  		}	
	});
});


// {
//    "score": 5,
//    "message": "Awesome trade"
// }
// POST '/users/{userId}/trades/{tradeId}/reviews'
app.post('/users/:userId/trades/:tradeId/reviews', auth, function(request, response){

	// validate data
	if (request.body.score < 0 || request.body.score > 5){
		response.send(400, 'Score must be between 0 and 5');
		return;  
	}

	// get the reviewee id
	var revieweeId = request.params.userId;
	var tradeId = request.params.tradeId;

	// define the query
	var query = User.findById(revieweeId, function(err, reviewee) {
		if (!err){

			console.log(JSON.stringify(request.body, undefined, 2));

			// make the review
			var review = new Review(request.body);
			review.date = new Date();
			review.reviewer = {'firstName':request.user.firstName, 'lastName': request.user.lastName, 'userId': request.user._id };	
			review.tradeId = tradeId;
			review.save(errorFunction);

			console.log(JSON.stringify(review, undefined, 2));
			// TODO - check the review is legal (ie. they both belong to the trade, and they haven't reviewed it yet)

			// add the review
			reviewee.reviews.push(review);
			reviewee.save();

			response.send(204);
		}
		else {
			response.send(500, 'An error happened with the query');  
		}
	});
});


// GET '/users'
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




// method to upload a profile image
app.post('/users/:id/image', auth, function(request, response){
	var tempPath = request.files.file.path;
	var targetPath = path.resolve('./images/users/profile/' + body.params.id + '.png');

	if (path.extname(req.files.file.name).toLowerCase() === '.png'){
		fs.rename(tempPath, targetPath, function(err){
			if (err) {
				console.log(err);
				return;
			}

			console.log('Image uploaded to ' + targetPath);
			response.send(204, 'Image uploaded to ' + targetPath);

		});

	} else {
		fs.unlink(tempPath, function(){
			if (err){
				throw err;
			}

			console.log('Only .png files are allowed!');
			response.send(400, 'Only .png files are allowed!');
		})
	}
});


// POST '/users/{userId}/resources'
// {
// 	"type": "tools",
// 	"location":{
// 	 	"lat": 13.4,
// 		"lon": 123.3
// 	},
// 	"title": "Spade",
// 	"description": "A bit battered, but still works fine.",
// 	"points": 1
// }
app.post('/users/:id/resources', auth, function(request, response){

	if(request.user._id != request.params.id){
		response.send(403, 'You can only add resources to your own account.');
		return;
	}

	// create the resource
	var resource = new Resource(request.body);
	resource.save(function(err){

		if(err){
			response.send(500);
			return;
		}

		User.findById(request.params.id, function(err, user){

			if(err){
				response.send(500);
				return;
			}

			if(!user){
				response.send(404, 'That user does not exist');
				return;
			}

			user.resources.push(resource._id);
			user.save(function(err){
				if(err){
					response.send(500);
					return;
				}

				response.send(201, JSON.stringify(resource, undefined, 2));
			});

		});
	});
});




//-------------------------------------------------------------------------------
// string manipulation functions
//-------------------------------------------------------------------------------


String.prototype.capitalize = function()
{
	return this.charAt(0).toUpperCase() + this.substr(1).toLowerCase();
};

String.prototype.toTitleCase = function()
{
    return this.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}



//---------------------------------------------------------------------------------
// Mongoose schema helper method
//---------------------------------------------------------------------------------

// This method gets all the public fields of the Schema object, ignoring all the Schema stuff and '_id' field.
// Means can use the created Model as the update parameters.
mongoose.Model.prototype.getFieldsExcludingId = function(){

	var fields = new Array();
	for(var field in this._doc){
		if(field != '_id' ){
			fields[field] = this._doc[field];
		}
	}
	return fields;
};