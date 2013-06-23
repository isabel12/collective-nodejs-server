var express = require("express");
var mongoose = require ("mongoose"); 
var fs = require("fs");
var path = require("path");

var models = require('./models');
var tradeLogic = require('./tradeLogic');
var jsonValidation = require('./jsonValidation');
var User, Review, Profile, Resource, Trade, Message, ProfileUpdate;  // mongoose schemas
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
	Trade = mongoose.model('Trade');
	Message = mongoose.model('Message');
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
	User.findOne({'email':user}, function(err, user){
		if (!err){
			if (!user){
				console.log('No user exists');
				err = new Error('No user exists');
			} else {
				var authenticated =  user.authenticate(pass);

				if (!authenticated){
					err = new Error('Username and password do not match');
				}
			}
		}
		callback(err, user);		
	}); 
});

// admin authentication for test methods
var adminAuth = express.basicAuth(function(user, pass, callback) {

	if(user != 'isabel.broomenicholson@gmail.com'){
		callback(new Error('Not authorized.'), null);
		return;
	}

	User.findOne({'email':user}, function(err, user){
		if (!err){
			if (!user){
				console.log('No user exists');
				err = new Error('No user exists');
			} else {
				var authenticated =  user.authenticate(pass);

				if (!authenticated){
					err = new Error('Username and password do not match');
				}
			}
		}
		callback(err, user);		
	}); 
});



// The API end points
//--------------------------------------------------------------------------------------------------------------
var errorFunction = function(err){
	if (err) {
		console.log('Database error: ' + err);
	}
};

// root of the application
app.get('/', function(request, response){
	response.send('See <a href="https://github.com/isabel12/collective-nodejs-server/blob/master/README.md"> here </a> for API details');
});



// GET '/authenticate'
// This method returns the 
app.post('/authenticate', auth, function(request, response){
	var profile = new Profile(request.user);
	profile.rating = request.user.rating;

	response.send(200, JSON.stringify(profile, undefined, 2));
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
app.post('/register', function(request, response){

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
app.post('/getProfile/:id', auth, function(request, response){

	// find the user
	var query = User.findById(request.params.id, function(err, user) {

		if (!err){
			console.log(JSON.stringify(user, undefined, 2));
			if (!user){
				response.send(404, 'That user does not exist.');
			}


			var profile = new Profile(user);
			profile.rating = user.rating;

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
app.post('/updateProfile/:id', auth, function(request, response){
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


// method to upload a profile image
app.post('/users/:id/uploadimage', auth, function(request, response){
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
//   },
// 	 "points":2
// }
app.post('/users/:id/addResource', auth, function(request, response){

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

		response.send(201, JSON.stringify(resource.returnType, undefined, 2));
	});
});


// Gets all the user's resources
app.post('/users/:userId/getResources', auth, function(request, response){
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
app.post('/getResource/:id', auth, function(request, response){
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
app.post('/updateResource/:id', auth, function(request, response){
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
app.post('/deleteResource/:id', auth, function(request, response){
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
app.post('/getResourceLocations', auth, function(request, response){
	// get query string parameters
	var lat = Number(request.query.lat);
	var lon = Number(request.query.lon);
	var radius = Number(request.query.radius);
	var filters = typeof request.query.filter=="string"? new Array(request.query.filter) : request.query.filter; // put in array if single item
	var searchTerm = request.query.searchterm;

	console.log(JSON.stringify(request.query));

	// convert
	request.query.lat = lat;
	request.query.lon = lon;
	request.query.radius = radius;
	request.query.filter = filters;

	console.log(JSON.stringify(request.query));

	// validate input
	var validationMessage = validateJSON(request.query, FilterResourceSchema);
	if (validationMessage){
		console.log("Validation failed: " + validationMessage);
		response.send(400, validationMessage);
		return;
	}

	// add location to the query
	var query = { 
					// location: { $near: 
					// 	{ $geometry: 
					// 		{  type : "Point" , 
					// 		   coordinates: [lon, lat] } },
					// 	$maxDistance : radius
					// }
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
			console.log(JSON.stringify(err, undefined, 2));
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


// {
// 	  'resourceId': "51c536476f2b4a7016000005",
// }
app.post('/addTrade', auth, function(request, response){

	var resourceId = request.body.resourceId;
	var me = request.user;

	console.log('got here');

	// validate input
	try{
		mongoose.Types.ObjectId(resourceId);
	} catch(e){
		response.send(400, 'Invalid resourceId.');
		return;
	}

	// get resource
	Resource.findById(request.body.resourceId)
	.populate('owner', 'firstName lastName')
	.exec(function(err, resource){
		if(err){
			response.send(500, err);
			console.log(JSON.stringify(err, undefined, 2));
			throw err;
		}

		// check resource exists
		if(!resource){
			response.send(404, 'Resource could not be found.');
			return;
		}

		// check you aren't the owner
		if(resource && resource.owner.toString() == me._id.toString()){
			response.send(403, 'You cannot borrow your own resource.');
			return;
		}

		// check you are not borrowing it currently
		var queryParams = {'resource': mongoose.Types.ObjectId(resourceId), 'borrower.userId': me._id};
		Trade.findOne(queryParams, function(err, existingTrade){
			if(err){
				response.send(500, err);
				console.log(JSON.stringify(err, undefined, 2));
				return;
			}

			if(existingTrade){
				response.send(403, 'You are already borrowing that resource: ' + JSON.stringify(existingTrade));
				return;
			}

			// create the new trade
			var newTrade = new Trade({
				'resource': resource._id, 
				'borrower': {'firstName': me.firstName, 'lastName': me.lastName, 'userId': me._id},
				'owner': {'firstName': resource.owner.firstName, 'lastName': resource.owner.lastName, 'userId': resource.owner._id},
				'state': tradeLogic.states.PENDING_ACCEPTED });

			// save the new trade
			newTrade.save(function(err){
				if(err){
					response.send(500, err);
					console.log(JSON.stringify(err, undefined, 2));
					return;
				}	

				// send the trade back
				var result = JSON.stringify(newTrade.returnType, undefined, 2);
				console.log(result)
				response.send(result);
			});
		});
	});
});



app.post('/getTrades', adminAuth, function(request, response){
	
	Trade.find(function(err, trades){
		if(err){
			console.log(JSON.stringify(err, undefined, 2));
			response.send(500, JSON.stringify(err, undefined, 2));
			return;
		}	

		var result = new Array();
		for (var i = 0; i < trades.length; i++) {
			result[i] = trades[i].returnType;
		};


		response.send(JSON.stringify(result, undefined, 2));
	});

});




//
//{
//	"message": "Hey yeah thats fine.  See you then!"
//}
//
app.post('/trades/:tradeId/Actions', auth, function(request, response){
	var tradeId = request.params.tradeId;
	var action = request.query.action;
	
	// check the action is valid
	if(!tradeLogic.isValidAction(action)){
		response.send(400, 'Action is invalid. It must be contained in: ' + tradeLogic.actions);
	}


	// find the trade
	Trade.findById(tradeId)
	.populate('resource', 'points')
	.exec(function(err, trade){
		if(err){
			throw err;
			return;
		}	

		// check the trade exists
		if(!trade){
			console.log('trade doesn\'t exist');
			response.send(404);
			return;
		}

		// check the user is allowed to do the action
		if(!trade.canDoAction(request.user._id, action)){
			response.send(403, 'You are not authorised to do that action: ' + action);
			return;
		}

		// perform the action
		switch(action){
			case tradeLogic.actions.ADD_MESSAGE:
				addMessage(request, response, trade);
				break;
			case tradeLogic.actions.ACCEPT:
				accept(request, response, trade);
				break;
			case tradeLogic.actions.AGREE:
				if(trade.state == tradeLogic.states.PENDING_COMPLETE_BORROWER || trade.state == tradeLogic.states.PENDING_COMPLETE_OWNER){
					transferPoints(request, response, trade, tradeLogic.actions.COMPLETE);
				} 
				// todo, if state is ACCEPTED
				break;
			default:
				response.send(500, 'Action is not yet supported.');
		}

	});
});





var addMessage = function(request, response, trade){
	var message = new Message({
		'sender':{'firstName':request.user.firstName, 'lastName':request.user.lastName, 'userId': request.user._id}, 
		'date': new Date(), 
		'message': request.body.message});

	trade.messages.push(message);
	trade.save(function(err){
		if(err){
			throw err;
			return;
		}
	});

	response.send(200, JSON.stringify(message, undefined, 2));
};

var accept = function(request, response, trade){
	trade.state = tradeLogic.states.ACCEPTED;
	trade.save(function(err){
		if(err){
			response.send(500, err);
			console.log(JSON.stringify(err, undefined, 2));
			return;
		}
	});

	response.send(200, JSON.stringify(trade.returnType, undefined, 2));
};


var decline = function(request, response, trade){
	trade.state = tradeLogic.states.DECLINED;
	trade.save(function(err){
		if(err){
			response.send(500, err);
			console.log(JSON.stringify(err, undefined, 2));
			return;
		}
	});

	response.send(200, JSON.stringify(trade.returnType, undefined, 2));
};


var cancel = function(request, response, trade){


};


var transferPoints = function(request, response, trade, desiredState){

	console.log('transferring points');
	
	var errorState = '';
	var previousState = trade.state;

	// mark trade as processing
	var shouldReturn = false;
	trade.state = tradeLogic.states.PROCESSING;
	trade.save(function(err){
		if(err){
			response.send(500, err);
			console.log(JSON.stringify(err, undefined, 2));
			shouldReturn = true;
		}
	});
	if(shouldReturn){
		return;
	}


	// transfer the points from the owner
	console.log(trade.ownerId);
	console.log(JSON.stringify(trade, undefined, 2));
	User.findById(trade.ownerId, function(err, owner){

		if(err){
			errorState = 'Points transfer failed, need to reverse state back to ' + previousState;
			console.log(errorState);
			console.log(JSON.stringify(err, undefined, 2));	
			return;
		}

		if(!owner){
			errorState = 'Points transfer failed, need to reverse state back to ' + previousState;
			console.log(errorState);
			console.log('Owner could not be found.');
			return;
		}

		console.log(owner);
		console.log(trade);

		owner.points = owner.points + trade.resource.points;
		owner.save(function(err){
			if(err){
				errorState = 'Points transfer failed, need to reverse state back to ' + previousState;
				console.log(errorState);
				console.log(JSON.stringify(err, undefined, 2));
				return;
			}

			// transfer points from borrower
			User.findById(trade.borrowerId, function(err, borrower){

				// attempt the transfer
				var borrowerTransferSuccessful;
				if(!err && borrower){
					borrower.points = borrower.points - trade.resource.points;
					borrower.save(function(err){
						if(!err){
							borrowerTransferSuccessful = true;
						}
					});
				}

				// if error, reverse everything
				if(err || !borrower || !borrowerTransferSuccessful){
					errorState += 'Transfer from borrower failed.  Need to reverse owner points transfer.';
					console.log(errorState);
					console.log(err);

					// try reverse the owner points
					owner.points = owner.points - trade.points;
					owner.save(function(err){
						if(err){
							console.log(JSON.stringify(err, undefined, 2));
							return;
						}

						// reversal successful, return 500 error
						errorState = '';
						response.send(500, 'Changing state to complete failed.  Not to worry; everything was reversed correctly.');
					});
					return;  // definitely don't want anything else happening after this except checking for error state;
				}


				// yay successful, change state to complete
				trade.state = desiredState;
				trade.save(function(err){
					if(err){
						errorState = 'Points successfully transferred, but error changing trade state to ' + desiredState;
						console.log(errorState);
						console.log(JSON.stringify(err, undefined, 2));
						return;
					}

					// yay successful, remove any error state messages
					errorState = '';
					response.send(200, trade.returnType);

				});
			});
		});
	});

	// check for illegal state
	if(errorState != ''){
		response.send(500, 'Oh no, something went wrong, and trade is in an illegal state.  We are working on it!');
		throw new Error('Illegal state: ' + errorState);
	}
};


var markAsCancelled = function(request, response, trade){


};


var markAsComplete = function(request, response, trade){


};


app.listen(port, function() {
	console.log("Listening on " + port);
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