var express = require("express");
var mongoose = require ("mongoose"); 
var fs = require("fs");
var path = require("path");

var models = require('./models');
var jsonValidation = require('./jsonValidation');
var User, Review, Profile, Resource, ProfileUpdate;  // mongoose schemas
var UpdateProfileSchema, RegisterProfileSchema, FilterResourceSchema, AddResourceSchema, UpdateResourceSchema, validateJSON;// validation schemas


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
FilterResourceSchema = jsonValidation.FilterResourceSchema;
AddResourceSchema = jsonValidation.AddResourceSchema;
UpdateResourceSchema = jsonValidation.UpdateResourceSchema;
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
			response.send(500, err);
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
	if(body.city){
		body.city = body.city.trim().toTitleCase();
	}
	if(body.postcode){
		body.postcode = body.postcode.trim();
	}
	if(body.firstName){
		body.firstName = body.firstName.trim().capitalize();
	}
	if(body.lastName){
		body.lastName = body.lastName.trim().capitalize();
	}

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


// {
//   "type": "tools",
//   "title": "Axe",
//   "description": "Red",
//   "location": {
//     "lat": -41.311736,
//     "lon": 174.776634
//   }
// }
app.post('/users/:id/resources', auth, function(request, response){

	// make sure the user is editing their own resource
	if(request.user._id != request.params.id){
		response.send(403, 'You can only add resources to your own account.');
		return;
	}

	// tidy up input
	request.body.type = request.body.type.toLowerCase();
	request.body.title = request.body.title.capitalize();
	request.body.description = request.body.description.capitalize();

	// validate input
	var validationMessage = validateJSON(request.body, AddResourceSchema);
	if (validationMessage){
		response.send(400, validationMessage);
		return;
	}

	// create the resource
	var resource = new Resource(request.body);
	resource.location = {type: "Point", coordinates: [request.body.location.lon, request.body.location.lat]};
	resource.owner = request.user._id;

	resource.save(function(err){

		if(err){
			response.send(500, err);
			console.log(err);
			return;
		}

		// find user
		User.findById(request.params.id, function(err, user){

			if(err){
				response.send(500, err);
				return;
			}

			// note: not necessary to check user not null - auth already does it.

			// add resource to users account
			user.resources.push(resource._id);
			user.save(function(err){
				if(err){
					response.send(500, err);
					return;
				}

				response.send(201, JSON.stringify(resource.returnType, undefined, 2));
			});

		});
	});
});


// Gets all the user's resources
app.get('/users/:userId/resources', auth, function(request, response){
	var id = request.params.userId;

	Resource.find({'owner': id}, function(err, resources){
		if(err){
			response.send(500);
			return;
		}

		var results = new Array();
		for (var i = 0; i < resources.length; i++) {
			results[i] = resources[i].returnType;
		};
		response.send(JSON.stringify(results, undefined, 2));
	});
});


// Gets an individual resource with all details.
app.get('/resources/:id', auth, function(request, response){
	var id = request.params.id;

	Resource.find({'_id': id}, function(err, resources){
		if(err){
			response.send(500);
			return;
		}

		var results = new Array();
		for (var i = 0; i < resources.length; i++) {
			results[i] = resources[i].returnType;
		};

		response.send(JSON.stringify(results, undefined, 2));
	});
});


// {
//   "type": "tools",
//   "title": "Axe",
//   "description": "Red",
//   "location": {
//     "lat": -41.311736,
//     "lon": 174.776634
//   }
// }
// updates an individual resource
app.put('/resources/:id', auth, function(request, response){
	var body = request.body;

	// tidy up input
	if(body.type){
		body.type = body.type.toLowerCase();
	}
	if(body.title){
		body.title = body.title.capitalize();
	}
	if(body.description){
		body.description = body.description.capitalize();
	}

	// validate input
	var validationMessage = validateJSON(body, UpdateResourceSchema);
	if (validationMessage){
		response.send(400, validationMessage);
		return;
	}

	// form update arguments
	var updateArguments = new Resource(body).getFieldsExcludingId();
	updateArguments.location = {type: "Point", coordinates: [body.location.lon, body.location.lat]};


	// update
	Resource.update({'_id': request.params.id, 'owner': request.user._id}, updateArguments, function(err, numberAffected, raw){
		if(!err){
			// check the resource existed, and you own it
			if(numberAffected == 0){
				response.send(404, 'You do not own a resource with that id.');
				return;
			}

			// send the updated resource back
  			Resource.findById(request.params.id, function(err, resource){
  				if (!err){
					response.send(200, JSON.stringify(resource.returnType, undefined, 2));
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


// deletes an individual resource
app.del('/resources/:id', auth, function(request, response){
	var id = request.params.id;

	Resource.findById(id, function(err, resource){
		if(err){
			response.send(500);
			return;
		}

		// check you could find it
		if (!resource){
			response.send(404, 'That resource could not be found.');
			return;
		}

		// check you own it
		if (resource.owner.toString() != request.user._id.toString()){
			response.send(403, 'You can only delete a resource owned by you.' );
			return;
		}

		// remove the resource
		Resource.findByIdAndRemove(id, function(err){
			if(err){
				response.send(500);
				return;
			}

			response.send(204, 'Resource successfully deleted.');
		});
	});
});


// GET '/resources?lat={latitude}&lon={longitude}&radius={radiusInMetres}&filter={type1}&filter={type2}&searchterm=spade'
//
//	lat = latitude value.  Compulsary.
//	lon = longitude value.  Compulsary.
//  radius = the radius of the search area in metres from the given location.  Compulsary.
//	filter = single or array of types to filter by.  Not compulsary.
// 	searchterm = a single string to search titles by.  Not compulsary.
//
// Eg:
 // /resources?lat=-41.315011&lon=174.778131&radius=800
	// /resources?lat=-41.315011&lon=174.778131&radius=800&filter=tools
 // /resources?lat=-41.315011&lon=174.778131&radius=800&filter=tools&filter=compost
	// /resources?lat=-41.315011&lon=174.778131&radius=200&filter=tools&searchterm=spade
//
//
app.get('/resourceLocations', auth, function(request, response){
	// get query string parameters
	var lat = Number(request.query.lat);
	var lon = Number(request.query.lon);
	var radius = Number(request.query.radius);
	var filters = typeof request.query.filter=="string"? new Array(request.query.filter) : request.query.filter; // put in array if single item
	var searchTerm = request.query.searchterm;

	// convert
	request.query.lat = lat;
	request.query.lon = lon;
	request.query.radius = radius;
	request.query.filter = filters;

	// validate input
	var validationMessage = validateJSON(request.query, FilterResourceSchema);
	if (validationMessage){
		console.log("Validation failed: " + validationMessage);
		response.send(400, validationMessage);
		return;
	}

	// add location to the query
	var query = { 
					location: { $near: 
						{ $geometry: 
							{  type : "Point" , 
							   coordinates: [lon, lat] } },
						$maxDistance : radius
					}
				};

	// add filters to query
	if(filters && (filters.length != 0)){
		query.type = {$in: filters};
	}

	// add title search to query
	query.title = new RegExp(searchTerm, 'i'); // 'i' means ignore case

	// get results
	Resource.find(query, 'type location _id', function(err, resources){

		if(err){
			response.send(500, err);
			console.log(err);
			return;
		}

		// format and return
		var result = new Array();
		for (var i = 0; i < resources.length; i++) {
			result[i] = resources[i].locationReturnType;
		};
		response.send(JSON.stringify(result, undefined, 2));
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