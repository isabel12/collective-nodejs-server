var express = require("express");
var mongoose = require ("mongoose"); 
var fs = require("fs");
var path = require("path");

var models = require('./models');
var tradeLogic = require('./tradeLogic');
var jsonValidation = require('./jsonValidation');
var im = require('imagemagick');
var User, Review, Resource, Trade, Message, ProfileUpdate, ProfileImage;  // mongoose schemas
var UpdateProfileSchema, RegisterProfileSchema, FilterResourceSchema, AddResourceSchema, UpdateResourceSchema, validateJSON;// validation schemas


// find appropriate db to connect to, default to localhost
var uristring = 
process.env.MONGOLAB_URI || 
process.env.MONGOHQ_URL || 
'mongodb://localhost/HelloMongoose';

// the appropriate port, or default to 5000  
var port = process.env.PORT || 5000;



// var newAuth = function(request, response, next){

// 	var email = request.query.email;
// 	var pass = request.query.pass;

// 	console.log(email + pass);

// 	User.findOne({'email':email}, function(err, user){
// 		if(err){
// 			response.send(500, err.message);
// 			return;
// 		}

// 		if (!user){
// 			response.send(401, 'No user exists.');
// 			return;
// 		} 
				
// 		var authenticated =  user.authenticate(pass);
// 		if (!authenticated){
// 			response.send(401, 'No user exists.');
// 			return;
// 		}

// 		// yay authenticated
// 		request.user = user;
// 		next();	
// 	}); 
// }




// set up the server
var app = express();
//app.use(newAuth);
app.use(express.logger());
app.use(express.limit('1mb'));
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
	Review = mongoose.model('Review');
	ProfileUpdate = mongoose.model('ProfileUpdate');
	Resource = mongoose.model('Resource');
	Trade = mongoose.model('Trade');
	Message = mongoose.model('Message');
	ProfileImage = mongoose.model('ProfileImage');
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

// root of the application
app.get('/', function(request, response){
	response.send('See <a href="https://github.com/isabel12/collective-nodejs-server/blob/master/README.md"> here </a> for API details');
});


// GET '/authenticate'
// This method returns the 
app.post('/authenticate', auth, function(request, response){
	var profile = request.user.returnType;
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
			console.log(err);
			response.send(500, err);
			return;
		}
 
 		// check the user doesn't exist already
		if(existingUsers.length != 0){
			console.log('An account already exists for that email.');
			console.log(JSON.stringify(existingUsers, undefined, 2));
			response.send(403, 'An account already exists for that email.');
			return;
		}

	  	// create a new user
	  	var newUser = new User(body);
	  	newUser.points = 0;
	  	newUser.numItemsLent = 0;
	  	newUser.numItemsBorrowed = 0;
	  	newUser.blackMarks = 0;
	  	newUser.set('password', body.password);
	  	newUser.save(function(err){
			if (err){
				console.log(err);
				response.send(500, err);
				return;
			}

		  	console.log('New user created: ' + JSON.stringify(newUser, undefined, 2));

			// make the object to return
		  	var profile = newUser.returnType;
		  	profile.rating = 0;
		  	console.log('Returning: ' + JSON.stringify(profile, undefined, 2));

		  	// send the new user
		  	response.send(201, profile);
		});
	});
});


app.post('/uploadProfileImage/:id', auth, function(request, response){

	var userId = request.params.id;

	console.log('body: ' + JSON.stringify(request.body, undefined, 2));
	console.log('userId: ' + userId);

	try{
		request.body.userId = mongoose.Types.ObjectId(userId);
	} catch(err){
		response.send(400, 'Parameter "id" is not valid');
		return;
	}

	var newImage = new ProfileImage(request.body);
	newImage.save(function(err){
		if (err){
			console.log(err);
			response.send(500, err);
			return;
		}

		response.send(200, newImage);
	});
});


app.post('/getProfileImage/:id', auth, function(request, response){

	var userId;
	try{
		userId = request.params.id;
	} catch(err){
		response.send(400, 'Parameter "id" is not valid');
		return;
	}

	ProfileImage.findOne({'userId': userId}, function(err, image){
		if (err){
			console.log(err);
			response.send(500, err);
			return;
		}

		if(!image){
			response.send(404, 'Image not found.');
			return;	
		}

		response.send(200, image.image);
	});
});


// GET '/user/{id}'
// Returns the profile of the user with the given id.
app.post('/getProfile/:id', auth, function(request, response){

	var userId;
	try{
		userId = mongoose.Types.ObjectId(request.params.id);
	} catch(err){
		response.send(400, 'Invalid id.  That user could not be found.');
		return;
	}

	// find the user
	var query = User.findById(request.params.id, function(err, user) {

		if(err){
			console.log(err);
			response.send(500);
			return;
		}

		if (!user){
			response.send(404, 'That user could not be found.');
			return;
		}

		var profile = user.returnType;
		profile.rating = user.rating;

		response.send(JSON.stringify(profile, undefined, 2)); 		
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
		if(err){
			console.log(err);
			response.send(500);
			return;
		}

		// check the user existed
		if(numberAffected == 0){
			response.send(404, 'That user does not exist.');
			return;
		}

		// find user
		User.findById(request.user._id, function(err, user){
			if(err){
				console.log(err);
				response.send(500);
				return;
			}

			// send the updated profile back
			var profile = user.returnType;
			profile.rating = user.rating;
			response.send(200, JSON.stringify(profile, undefined, 2));
		});	
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

	// get ids
	var reviewerId = request.user._id;
	var revieweeId;
	var tradeId;
	try{
		revieweeId = mongoose.Types.ObjectId(request.params.userId);
	} catch(err){
		response.send(400, 'Invalid id. That user could not be found.');
		return;
	}
	try{
		tradeId = mongoose.Types.ObjectId(request.params.tradeId);
	} catch(err){
		response.send(400, 'Invalid id. That trade could not be found.');
		return;
	}


	// get the trade
	Trade.findById(tradeId, function(err, trade){
		if(err){
			console.log(err);
			response.send(500);
			return;
		}

		// check the review is legal (ie. they both belong to the trade, and they haven't reviewed it yet)
		if (!trade.canDoAction(reviewerId, tradeLogic.actions.ADD_REVIEW)){
			response.send(403, 'You are not authorized to perform that action.');
			return;
		}

		var isOwner = trade.isOwner(reviewerId);

		// make and save the review
		User.findById(revieweeId, function(err, reviewee) {
			if(err){
				console.log(err);
				response.send(500);
				return;
			}	
		
			// make the review
			var review = new Review(request.body);
			review.date = new Date();
			review.reviewer = {'firstName':request.user.firstName, 'lastName': request.user.lastName, 'userId': request.user._id };	
			review.tradeId = tradeId;
			review.save(function(err){
				if(err){
					console.log(err);
					response.send(500);
					return;
				}

				// add the review
				reviewee.reviews.push(review);
				reviewee.save(function(err){
					if(err){
						console.log(err);
						response.send(500);
						return;
					}	

					// mark trade as reviewed
					if(isOwner){
						trade.ownerReviewed = true;
					} else {
						trade.borrowerReviewed = true;
					}
					trade.save(function(err){
						if(err){
							console.log(err);
							response.send(500);
							return;
						}	

						// send the response
						response.send(204);			
					});			
				});
			});
		});
	});
});


// GET '/users'
// Returns all users.  Test method
app.get('/users', auth, function(request, response) {

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
app.post('/uploadProfileImage/:id', function(request, response){

	// // first check it is your profile
	// if(request.params.id != request.user.id){
	// 	response.send(403, 'You can only upload images for your own profile.');
	// 	return;
	// }

	console.log('request.files: ' + JSON.stringify(request.files, undefined, 2));

	var tempPath = request.files.Filedata.path;
	var targetPath = path.resolve('./images/profile/' + request.params.id + '.png');

	if (path.extname(request.files.Filedata.name).toLowerCase() === '.png'){
		fs.rename(tempPath, targetPath, function(err){
			if(err){
				console.log(err);
				response.send(500);
				return;
			}

			console.log('Image uploaded to ' + targetPath);
			response.send(204, 'Image uploaded to ' + targetPath);
		});
	} 

	else {
		fs.unlink(tempPath, function(err){
			if (err){
				throw err;
			}

			console.log('Only .png files are allowed!');
			response.send(400, 'Only .png files are allowed!');
		});
	}


	// var imagePath = './images/profile/kittens.jpg';
	// var targetPath = './images/profile/' + request.params.id + '.jpg';


	// fs.readFile(imagePath, function(err, data){
	// 	if(err){
	// 		console.log(err);
	// 		response.send(500);
	// 		return;
	// 	}

	// 	fs.writeFile(targetPath, data, function(err){

	// 		if(err){
	// 			console.log(err);
	// 			response.send(500);
	// 			return;
	// 		}

	// 		console.log('Uploaded image to ' + targetPath);
	// 		response.send(200, 'Uploaded image to ' + targetPath);
	// 	});
	// });

});



// method to upload a profile image
app.post('/uploadResourceImage/:id', auth, function(request, response){

	// first check it is your profile
	if(request.params.id != request.user.id){
		response.send(403, 'You can only upload images for your own profile.');
		return;
	}

	var tempPath = request.files.file.path;
	var targetPath = path.resolve('./images/profile/' + body.params.id + '.png');

	if (path.extname(req.files.file.name).toLowerCase() === '.png'){
		fs.rename(tempPath, targetPath, function(err){
			if(err){
				console.log(err);
				response.send(500);
				return;
			}

			console.log('Image uploaded to ' + targetPath);
			response.send(204, 'Image uploaded to ' + targetPath);
		});
	} 

	else {
		fs.unlink(tempPath, function(err){
			if (err){
				throw err;
			}

			console.log('Only .png files are allowed!');
			response.send(400, 'Only .png files are allowed!');
		});
	}


	// var imagePath = './images/profile/kittens.jpg';
	// var targetPath = './images/profile/' + request.params.id + '.jpg';


	// fs.readFile(imagePath, function(err, data){
	// 	if(err){
	// 		console.log(err);
	// 		response.send(500);
	// 		return;
	// 	}

	// 	fs.writeFile(targetPath, data, function(err){

	// 		if(err){
	// 			console.log(err);
	// 			response.send(500);
	// 			return;
	// 		}

	// 		console.log('Uploaded image to ' + targetPath);
	// 		response.send(200, 'Uploaded image to ' + targetPath);
	// 	});
	// });

});


app.post('/getProfileImage/:id', auth, function(request, response){
	var imagePath = './images/profile/' + request.params.id + '.png';

	response.sendfile(path.resolve(imagePath));
});


app.get('/getResourceImage/:resourceId', function(request, response){
	var imagePath = './images/resource/' + request.params.resourceId + '.png';

	response.sendfile(path.resolve(imagePath));
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
	request.body.type = request.body.type.trim();

	// validate input
	if(tradeLogic.resourceTypes.indexOf(request.body.type) <= -1){
		response.send(400, 'Type field is invalid - should be one of: ' + tradeLogic.resourceTypes);
		return;
	}

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
			console.log(err);
			response.send(500);
			return;
		}

		response.send(201, JSON.stringify(resource.returnType, undefined, 2));
	});
});


// Gets all the user's resources
app.post('/users/:userId/getResources', auth, function(request, response){
	var userId;
	try{
		userId = mongoose.Types.ObjectId(request.params.userId);
	} catch(err){
		response.send(400, 'Invalid id. That resource could not be found.');
		return;
	}

	Resource.find({'owner': userId}, function(err, resources){
		if(err){
			console.log(err);
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

	// make sure it is a valid id
	var resourceId;
	try{
		resourceId = mongoose.Types.ObjectId(request.params.id);
	} catch(err){
		response.send(400, 'Invalid id. That resource could not be found.');
		return;
	}

	// find the resource
	Resource.find({'_id': resourceId}, function(err, resources){
		if(err){
			console.log(err);
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
	var resourceId;
	try{
		resourceId = mongoose.Types.ObjectId(request.params.id);
	} catch(err){
		response.send(400, 'Invalid id. That resource could not be found.');
		return;
	}

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
	Resource.update({'_id': resourceId, 'owner': request.user._id}, updateArguments, function(err, numberAffected, raw){
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
	// get resource id
	var resourceId;
	try{
		resourceId = mongoose.Types.ObjectId(request.params.id);
	} catch(err){
		response.send(400, 'Invalid id. That resource could not be found.');
		return;
	}

	Resource.findById(resourceId, function(err, resource){
		if(err){
			console.log(err);
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
		Resource.findByIdAndRemove(resourceId, function(err){
			if(err){
				console.log(err);
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
// 	  "resourceId": "51c8d791336bb31414000003"
// }
app.post('/addTrade', auth, function(request, response){

	var resourceId = request.body.resourceId;
	var me = request.user;

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

		// check you don't have too few points
		if(me.points <= -20){
			response.send(403, 'Sorry, you cannot go below -20 points.  You should give back to the community :)');
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


app.post('/users/:userId/getTrades', auth, function(request, response){
	// check they are your trades
	var userId = request.user._id;
	if(request.params.userId != userId.toString()){
		response.send(403, 'You can only access your own trades');
		return;
	}
	var userId

	// get the date
	var date;
	try{
		if(request.query.date){
			date = new Date();
			date.setISO8601(request.query.date.trim());
		}
	} catch (err){
		response.send(400, 'Date string is not valid.  Example format: ' + '2013-06-25T07:34:31.555Z');
		console.log(err);
		return;
	}

	// make the query
	var query = {
		$or: [{'owner.userId': userId}, {'borrower.userId': userId}]
	}
	if(date != null){
		query.lastUpdated = {$gte: date};
	}

	Trade.find(query, function(err, trades){
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

app.post('/getTrade/:tradeId', auth, function(request, response){
	var version = request.query.currVer ? Number(request.query.currVer): null;
	console.log(version);
	if(version == NaN){
		response.send(400, 'Query paramater "currVer" has to be an integer.');
	}

	tradeId = mongoose.Types.ObjectId(request.params.tradeId);
	try{
		tradeId = mongoose.Types.ObjectId(request.params.tradeId);
	} catch(err){
		response.send(400, 'Invalid id. That trade could not be found.');
		return;
	}

	Trade.findById(tradeId, function(err, trade){
		if(err){
			console.log(JSON.stringify(err, undefined, 2));
			response.send(500, JSON.stringify(err, undefined, 2));
			return;
		}	

		if(!trade){
			response.send(404, 'That trade could not be found.');
			return;
		}

		// if no version was specified
		if(version == null ){
			response.send(200, JSON.stringify(trade.returnType, undefined, 2));
			return;
		}

		// if a version was specified, and they are out of date
		var currentVersion = trade.__v ? trade.__v : 0;
		if(currentVersion > version){
			response.send(200, JSON.stringify(trade.returnType, undefined, 2));
			return;
		}

		// else they are up to date
		response.send(200, {});
		return;
	});
});


// {
// 	"message": "Hey yeah thats fine.  See you then!"
// }
//
app.post('/trades/:tradeId/Actions', auth, function(request, response){
	var action = request.query.action;
	var tradeId;
	try{
		tradeId = mongoose.Types.ObjectId(request.params.tradeId);
	} catch(err){
		response.send(400, 'Invalid id. That trade could not be found.');
		return;
	}
	
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
			case tradeLogic.actions.DECLINE:
				decline(request, response, trade);
				break;
			case tradeLogic.actions.AGREE:
				agree(request, response, trade);
				break;
			case tradeLogic.actions.DISAGREE:
				disagree(request, response, trade);
				break;
			case tradeLogic.actions.MARK_AS_COMPLETE:
				markAsComplete(request, response, trade);
				break;
			case tradeLogic.actions.CANCEL:
				cancel(request, response, trade);
				break;	
			case tradeLogic.actions.MARK_AS_FAILED:
				markAsFailed(request, response, trade);
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
	trade.lastUpdated = new Date();
	trade.save(function(err){
		if(err){
			throw err;
			return;
		}

		response.send(200, JSON.stringify(message, undefined, 2));
	});
};


var accept = function(request, response, trade){
	trade.state = tradeLogic.states.ACCEPTED;
	trade.lastUpdated = new Date();
	trade.save(function(err){
		if(err){
			response.send(500, err);
			console.log(JSON.stringify(err, undefined, 2));
			return;
		}

		response.send(200, JSON.stringify(trade.returnType, undefined, 2));
	});
};


var decline = function(request, response, trade){
	trade.state = tradeLogic.states.DECLINED;
	trade.lastUpdated = new Date();
	trade.save(function(err){
		if(err){
			response.send(500, err);
			console.log(JSON.stringify(err, undefined, 2));
			return;
		}

		response.send(200, JSON.stringify(trade.returnType, undefined, 2));
	});
};


var cancel = function(request, response, trade){
	var userId = request.user._id;

	if(trade.isBorrower(userId)){
		// change state
		trade.state = tradeLogic.states.PENDING_CANCELLED;
	}

	else if (trade.isOwner(userId)){
		// change state
		trade.state = tradeLogic.states.CANCELLED;
	}

	// save the change
	trade.lastUpdated = new Date();
	trade.save(function(err){
		if(err){
			response.send(500, err);
			console.log(JSON.stringify(err, undefined, 2));
			return;
		}

		// success!
		response.send(200, trade.returnType);
	});

};


var markAsComplete = function(request, response, trade){
	var userId = request.user._id;

	// work out next state
	var nextState;
	if(trade.isBorrower(userId)){
		nextState = tradeLogic.states.PENDING_COMPLETE_BORROWER;
	} else if (trade.isOwner(userId)){
		nextState = tradeLogic.states.PENDING_COMPLETE_OWNER;
	}

	// change state
	trade.state = nextState;
	trade.lastUpdated = new Date();
	trade.save(function(err){
		if(err){
			response.send(500, err);
			console.log(JSON.stringify(err, undefined, 2));
			return;
		}

		// success!
		response.send(200, trade.returnType);
	});
}


var agree = function(request, response, trade){
	if(trade.state == tradeLogic.states.PENDING_COMPLETE_BORROWER || trade.state == tradeLogic.states.PENDING_COMPLETE_OWNER){
		transferPoints(request, response, trade, tradeLogic.states.COMPLETE);
	} 
	else if(trade.state == tradeLogic.states.PENDING_CANCELLED){
		cancel(request, response, trade);
	}
}


var disagree = function(request, response, trade){
	trade.state = tradeLogic.states.ACCEPTED;
	trade.lastUpdated = new Date();
	trade.save(function(err){
		if(err){
			response.send(500, err);
			console.log(JSON.stringify(err, undefined, 2));
			return;
		}

		// success!
		response.send(200, trade.returnType);
	});
}


var markAsFailed = function(request, response, trade){
	// find borrower
	User.findById(trade.borrower.userId, function(err, borrower){
		if(err){
			response.send(500, err);
			console.log(JSON.stringify(err, undefined, 2));
			return;
		}

		// mark with black mark
		borrower.blackMarks += 1;
		borrower.save(function(err){
			if(err){
				response.send(500, err);
				console.log(JSON.stringify(err, undefined, 2));
				return;
			}

			// transfer points
			transferPoints(request, response, trade, tradeLogic.states.FAILED);
		});
	});
}

var transferPoints = function(request, response, trade, desiredState){
	var previousState = trade.state;

	// mark trade as processing
	trade.state = tradeLogic.states.PROCESSING;
	trade.lastUpdated = new Date();
	trade.save(function(err){
		if(err){
			response.send(500, err);
			console.log(JSON.stringify(err, undefined, 2));
			return;
		}

		// transfer the points from the owner
		User.findById(trade.ownerId, function(err, owner){

			if(err){
				console.log(JSON.stringify(err, undefined, 2));	
				reverseState(trade, previousState, response);
				return;
			}

			if(!owner){
				console.log('Owner could not be found.');
				reverseState(trade, previousState, response);
				return;
			}

			owner.points += trade.resource.points;
			owner.numItemsLent += 1;
			owner.save(function(err){
				if(err){
					console.log(JSON.stringify(err, undefined, 2));
					reverseState(trade, previousState, response);
					return;
				}

				// transfer points from borrower
				User.findById(trade.borrowerId, function(err, borrower){
					if(err){
						console.log(err);
						reverseOwnerTransfer(owner, trade, previousState, response);
						return;
					}
					else if( !borrower){
						console.log('Borrower not found');
						reverseOwnerTransfer(owner, trade, previousState, response);
						return;
					}

					// attempt the transfer
					borrower.points -= trade.resource.points;
					borrower.numItemsBorrowed += 1;
					borrower.save(function(err){
						if(err){
							console.log(JSON.stringify(err, undefined, 2));
							reverseOwnerTransfer(owner, trade);
							return;
						}
						
						// yay both transfers successful, change state to complete
						trade.state = desiredState;
						trade.save(function(err){
							if(err){
								console.log(JSON.stringify(err, undefined, 2));
								reverseOwnerTransfer(owner, trade, previousState, response);
								return;
							}

							// yay successful, remove any error state messages
							response.send(200, JSON.stringify(trade.returnType, undefined, 2));
						});
					});
				});
			});
		});
	});

};


var reverseOwnerTransfer = function(owner, trade, previousState, response){

	console.log('Transfer from borrower failed.  Reversing owner points transfer...');

	var message;	
	// try reverse the owner points
	owner.points -= trade.resource.points;
	owner.numItemsLent -= 1;
	owner.save(function(err){
		if(err){
			console.log(JSON.stringify(err, undefined, 2));
			console.log('Reversing owner points failed.  Also still need to change trade back to ' + previousState);
			response.send(500, 'Uhoh, something bad happened.  Trade is in an invalid state. We are on it!');
			return;
		}

		// points reversal successful, now need to reverse state
		reverseState(trade, previousState, response);
	});
};


var reverseState = function(trade, previousState, response){
	console.log('Reversing trade state back to ' + previousState + '...');

	trade.state = previousState;
	trade.save(function(err){
		if(err){
			console.log(JSON.stringify(err, undefined, 2));
			console.log('Error changing trade state to ' + desiredState);
			response.send(500, 'Uhoh, something bad happened.  Trade is in an invalid state. We are on it!');
			return;
		}

		// yay successful, remove any error state messages
		response.send(500, 'Something bad happened, but we managed to reverse it!');
	});
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

Date.prototype.setISO8601 = function (string) {
    var regexp = "([0-9]{4})(-([0-9]{2})(-([0-9]{2})" +
        "(T([0-9]{2}):([0-9]{2})(:([0-9]{2})(\.([0-9]+))?)?" +
        "(Z|(([-+])([0-9]{2}):([0-9]{2})))?)?)?)?";
    var d = string.match(new RegExp(regexp));

    var offset = 0;
    var date = new Date(d[1], 0, 1);

    if (d[3]) { date.setMonth(d[3] - 1); }
    if (d[5]) { date.setDate(d[5]); }
    if (d[7]) { date.setHours(d[7]); }
    if (d[8]) { date.setMinutes(d[8]); }
    if (d[10]) { date.setSeconds(d[10]); }
    if (d[12]) { date.setMilliseconds(Number("0." + d[12]) * 1000); }
    if (d[14]) {
        offset = (Number(d[16]) * 60) + Number(d[17]);
        offset *= ((d[15] == '-') ? 1 : -1);
    }

    offset -= date.getTimezoneOffset();
    time = (Number(date) + (offset * 60 * 1000));
    this.setTime(Number(time));
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