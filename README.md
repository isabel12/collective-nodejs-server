Collective Documentation
========================

Collective uses Basic Authentication - make sure you include the Authorization 
header based on the email and password to access all links (excluding registration).

Also, for POST and PUT, make sure to include the 'Content-Type: application/json' header.

## API Methods Currently Implemented

	GET			'/'														(links to this page)
	POST*		'/authenticate'											(Authenticates login, returning profile)
	POST 		'/register' 											(Register)
	POST*		'/getProfile/{userId}' 									(Gets a users profile)
	POST*		'/updateProfile/{userId}' 								(Updates the profile)
	POST*		'/uploadProfileImage/{userId}'							(Uploads a profile image)
	POST*		'/getProfileImage/{userId}'								(Gets the profile image)
	POST* 		'/users/{userId}/trades/{tradeId}/reviews' 				(Adds a review)
	POST* 		'/users/{userId}/addResource'  							(Adds a resource)
	POST* 		'/users/{userId}/getResources'  						(Gets all the users listed resources)
	POST* 		'/getResourceLocations'  								(Searches and filters all resource locations)
	POST* 		'/getResource/{resourceId}'  							(Returns the given resource)
	POST* 		'/updateResource/{resourceId}'  						(Updates the given resource)
	POST*		'/deleteResource/{resourceId}'  						(Deletes the given resource)
	POST*		'/uploadResourceImage/{resourceId}'						(Uploads a resource image)
	POST*		'/getResourceImage/{resourceId}'						(Gets the resource image)
	POST*		'/addTrade'												(Requests a new trade)
	POST*		'/getTrade/{tradeId}'									(Gets the trade)
	POST*		'/users/{userId}/getTrades'								(Gets all the user's trades)
	POST*		'/users/{userId}/getTrades?date=2013-06-25T07:34:31.555Z'(Gets all the users trades that have been updated since the given time)	
	POST*		'/getTrade/{tradeId}?currVer=2'							(Gets the trade if there is a newer version)
	POST*		'/trades/{tradeId}/Actions								(Method to perform all actions on a trade)
					- add_message
					- accept
					- decline
					- mark_as_complete
					- cancel
					- agree
					- disagree
					- mark_as_failed
					
	
	* requires 'Authorization' headers

## API Method Details

###Authenticate
This method allows you to authenticate the email/password combination, and returns the user associated with it.

####Request
	GET '/authenticate'

####Result
	{
	  "postcode": "6021",
	  "points": 0,
	  "numItemsLent": 0,
	  "numItemsBorrowed": 0,
	  "blackMarks": 0,
	  "lastName": "Broome-nicholson",
	  "firstName": "Isabel",
	  "email": "isabel.broomenicholson@gmail.com",
	  "city": "Wellington",
	  "address": "Wooopsdfsdfie",
	  "_id": "51bfc73c045b6e7812000002",
	  "reviews": []
	}	
* 401 - unauthorized

###Register
####Request
	POST '/users'
	{
	  "email":"isabel.broomenicholson@gmail.com",
	  "password":"password",
	  "firstName": "Isabel",
	  "lastName":"Broome-Nicholson",
	  "location":{
	 	  "lat": 13.4,
		  "lon": 123.3
	  },
	  "address": "Cool place on the hill",
	  "city": "Wellington",
	  "postcode":"6021"
	}

######'location'
* 'lat' must be between -90 and 90
* 'lon' must be between -180 and 180

######'email'
* Must match the regex /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$/
* Is automatically decapitalised

######'city'
* Must match the regex /^[A-Za-z]{3,20}\ ?([A-Za-z]{3,20})?$/
* Is automatically capitalised

######'postcode'
* Must match the regex /^[1-9][0-9]{3}$/
	

####Response
	{
	  "postcode": "6021",
	  "points": 0,
	  "numItemsLent": 0,
	  "numItemsBorrowed": 0,
	  "blackMarks": 0,
	  "lastName": "Broome-nicholson",
	  "firstName": "Isabel",
	  "email": "isabel.broomenicholson@gmail.com",
	  "city": "Wellington",
	  "address": "Wooopsdfsdfie",
	  "_id": "51bfc73c045b6e7812000002",
	  "reviews": []
	}	

* 201 - if successful (may be changed to 204 later)
* 400 - if field falidation failed.
* 403 - if an account already exists.
* 500 - if there was a server error.


###View Profile
####Request
	GET '/user/{id}'
	
####Response
	{
	  "id": "51c8d615e5ecced017000002",
	  "email": "isabel.broomenicholson@gmail.com",
	  "firstName": "Isabel",
	  "lastName": "Broome-nicholson",
	  "address": "Cool place on the hill",
	  "city": "Wellington",
	  "postcode": "6021",
	  "rating": "0.00",
	  "points": -4,
	  "numItemsLent": 0,
	  "numItemsBorrowed": 2,
	  "blackMarks": 1,
	  "reviews": [
	    {
	      "_id": "51c8e4c067d1ea9c10000002",
	      "message": "Stole my stuff!",
	      "score": 0,
	      "date": "2013-06-25T00:30:56.024Z",
	      "tradeId": "51c668d61e5272a40b000002",
	      "reviewer": {
	        "userId": "51c8d640e5ecced017000003",
	        "lastName": "Pip",
	        "firstName": "Jenny"
	      }
	    }
	  ]
	}	
*	404 - if user doesn't exist.
*	500 - if there was a server error.


###Update Profile

Updates the given profile.  The JSON passed to the method can have as many or few of the required fields - only the fields that are allowed to be changed will be changed; 
all other fields will be ignored.

Fields allowed to be changed are:
* firstName
* lastName
* location
* address
* city
* postcode
* password

####Request
	PUT '/user/{id}'
	{
	 "firstName": "Isabel",
		"lastName":"Broome-Nicholson",
	 	"location":{
		 	"lat": 13.4,
			"lon": 123.3
		},
		"address": "Cool place on the hill",
	 	"city": "Wellington",
		"postcode":"6021",
		"password": "bunnies"
	}

######'location'
* 'lat' must be between -90 and 90
* 'lon' must be between -180 and 180

######'city'
* Must match the regex /^[A-Za-z]{3,20}\ ?([A-Za-z]{3,20})?$/
* Is automatically capitalised

######'postcode'
* Must match the regex /^[1-9][0-9]{3}$/

	
####Response
	{
	 	"postcode": "6021",
		"points": 0,
		"lastName": "Broome-nicholson",
		"firstName": "Isabel",
		"email": "isabel.broomenicholson@gmail.com",
		"city": "Wellington",
		"address": "Wooopsdfsdfie",
		"_id": "51bfc73c045b6e7812000002",
		"reviews": []
	}
	
* 400 - if fields are not valid
* 403 - if not your profile
* 404 - if the user doesn't exist
* 500 - if internal server error.


###Add a review
Adds a review from you to the user with the given {userId}, regarding the trade {tradeId}.  
If the trade is still in progress, or you have already reviewed, you will not be able to add one.

####Request
	POST '/users/{userId}/trades/{tradeId}/reviews'
	{
		"score": 5,
		"message": "Awesome trade"
	}

####Response
* 204 - if successful
* 400 - if the input is not valid
* 403 - if you are not allowed to add a review to the given trade
* 500 - if there is a server error

### List a Resource

####Request
	POST '/users/{userId}/resources'
	{
		"type": "tools",
		"location":{
		 	"lat": -41.311736,
			"lon": 174.776634
		},
		"title": "Axe",
		"description": "Red",
		"points": 1
	}

######'type'
* must be one of 'tools', 'land', 'plants', 'services'

######'points'
* Must be between 1 and 5

######'title'
* Automatically capitalised

######'description'
* Automatically capitalised

####Response
201 - created
	{
	  "type": "tools",
	  "_id": "51c23719cf5903101a000002",
	  "title": "Axe",
	  "description": "Red",
	  "owner": "51bfc73c045b6e7812000002",
	  "location": {
	    "lat": -41.311736,
	    "lon": 174.776634
	  }
	}

* 400 - invalid input
* 403 - not your account
* 500 - server error


### Get Resource Map Locations

####Request

	GET '/resourceLocations'
	
	eg:
	 	/resourceLocations?lat=-41.315011&lon=174.778131&radius=800
		/resourcesLocations?lat=-41.315011&lon=174.778131&radius=800&filter=tools
 		/resourcesLocations?lat=-41.315011&lon=174.778131&radius=800&filter=tools&filter=compost
		/resourceLocations?lat=-41.315011&lon=174.778131&radius=200&filter=tools&searchterm=spade
	
######'lat'
* Compulsary.
* Latitude value.  


######'lon'
* Compulsary.
* Longitude value. 


######'radius'
* Compulsary.
* The radius of the search area in metres from the given location.  


######'filter'
* Not compulsary.
* An array of string that match against the resources 'type' value.  
* Case insensitive

######'searchterm'
* Not compulsary.
* A single string to search titles by.
* Case insensitive

####Response

	[
	  {
	    "type": "compost",
	    "_id": "51c216a8189477500f000003",
	    "location": {
	      "lat": -41.315011,
	      "lon": 174.778131
	    }
	  },
	  {
	    "type": "tools",
	    "_id": "51c216b1189477500f000004",
	    "location": {
	      "lat": -41.316115,
	      "lon": 174.778056
	    }
	  }
	]

###Get all a users Resources
####Request
	GET '/users/{userId}/resources'
####Response
* 200 OK + list of resources
* 500 - internal server error 

###Get a Resource
####Request
	GET '/resources/{resourceId}'
####Response
	{
	  "type": "tools",
	  "_id": "51c2530cde596d3814000002",
	  "title": "Red axe",
	  "description": "Red axe with a nice mahogany handle",
	  "owner": "51bfc73c045b6e7812000002",
	  "location": {
	    "lat": -41.311736,
	    "lon": 174.776634
	  }
	}

###Update a Resource
####Request
{
	"title": "Red Axe"
}
* Note: fields allowed to be changed are 'location', 'type', 'title', 'description', 'points'

####Response
	{
	  "type": "tools",
	  "_id": "51c2530cde596d3814000002",
	  "title": "Red axe",
	  "description": "Red axe with a nice mahogany handle",
	  "owner": "51bfc73c045b6e7812000002",
	  "location": {
	    "lat": -41.311736,
	    "lon": 174.776634
	  }
	}
	
* 400 - invalid input
* 403 - not your resource
* 404 - couldn't find the resource
* 500 - server error

###Delete a Resource
####Request
	DELETE '/resources/{resourceId}'
####Response
* 204 - success no content
* 403 - not your resource
* 404 - couldn't find the resource
* 500 - server error


###Request a Trade
####Request
	POST '/addTrade'
	{
		"resourceId": "51c536476f2b4a7016000005"
	}
	
####Response
	{
	  "resourceId": "51c67561f23f86ac12000002",
	  "id": "51c6d48b27b136c819000002",
	  "borrower": {
	    "userId": "51c535916f2b4a7016000002",
	    "lastName": "Broome-nicholson",
	    "firstName": "Isabel"
	  },
	  "state": "p_accepted",
	  "ownerActions": [
	    "accept",
	    "decline",
	    "add_message"
	  ],
	  "borrowerActions": [
	    "add_message"
	  ],
	  "messages": []
	}

	
###Add a message
####Request
	POST '/trades/{tradeId}/Actions?action=add_message'
	{
		"message": "Hey yeah thats fine.  See you then!"
	}
	
####Response
	{
	  "date": "2013-06-23T11:01:26.967Z",
	  "message": "Hey yeah thats fine.  See you then!",
	  "_id": "51c6d58627b136c819000003",
	  "sender": {
	    "firstName": "Isabel",
	    "lastName": "Broome-nicholson",
	    "userId": "51c535916f2b4a7016000002"
	  }
	}
	
* 403 - if not allowed to do that action.
	
###Perform any other action on a trade
####Request
	
	POST '/trades/{tradeId}/Actions?action=accept'
	
	POST '/trades/{tradeId}/Actions?action=decline'
	
	POST '/trades/{tradeId}/Actions?action=cancel'
	
	POST '/trades/{tradeId}/Actions?action=mark_as_complete'
	
	POST '/trades/{tradeId}/Actions?action=agree'
	
	POST '/trades/{tradeId}/Actions?action=disagree'

	POST '/trades/{tradeId}/Actions?action=mark_as_failed'

####Response

* 200 - Currently returns the trade with all messages (need to change this)	
* 403 - if not allowed to do that action.


### Get an individual trade
This method takes an optional parameter 'currVer', which is a positive integer.  This version is specified by the 'version' field on the trade.
* If no parameter specified, or not up to date, returns the trade.
* Otherwise returns an empty body.

####Request
	POST '/getTrade/{tradeId}'
	{}

	POST '/getTrade/{tradeId}?currVer={versionNumber}'
	{}
	
####Response
######If out of date, or no parameter specified:
	{
	  "resourceId": "51c8d791336bb31414000003",
	  "id": "51c668d61e5272a40b000002",
	  "borrower": {
	    "firstName": "Isabel",
	    "lastName": "Broome-nicholson",
	    "userId": "51c8d615e5ecced017000002"
	  },
	  "owner": {
	    "firstName": "Jenny",
	    "lastName": "Pip",
	    "userId": "51c8d640e5ecced017000003"
	  },
	  "state": "p_complete_owner",
	  "ownerActions": [
	    "add_message"
	  ],
	  "borrowerActions": [
	    "agree",
	    "disagree",
	    "add_message"
	  ],
	  "messages": [
	    {
	      "date": "2013-06-25T05:31:31.555Z",
	      "message": "wwooooo",
	      "_id": "51c92b338df2878412000002",
	      "sender": {
	        "firstName": "Isabel",
	        "lastName": "Broome-nicholson",
	        "userId": "51c8d615e5ecced017000002"
	      }
	    },
	    {
	      "date": "2013-06-25T05:32:06.029Z",
	      "message": "wwooooo",
	      "_id": "51c92b568df2878412000003",
	      "sender": {
	        "firstName": "Isabel",
	        "lastName": "Broome-nicholson",
	        "userId": "51c8d615e5ecced017000002"
	      }
	    }
	  ],
	  "__v": 2
	}
	
######if up to date:
	{}
	
	
### Get a user's Trades
####Request

	POST '/users/:userId/getTrades'
	
	POST '/users/:userId/getTrades?date=2013-06-25T07:34:31.555Z'

####Response

* 200 with list of trades
* 403 if not your account
* 400 if date string isn't valid
* 

### Upload a Profile image
This method allows the upload of an image as a base64 string.  The request must be within 200kb, or it will be rejected.
If the image already exists, the method will overwrite it.

####Request
	POST '/uploadProfileImage/{userId}'
	{
		"image": <the image string>,
		"hash": <an MD5 hash of the image>
	}

####Response
* 204 - no content if successful
* 403 - if not your profile
* 400 - if {userId} is not valid
* 500 - server error
* 413 - image is too large


### Get a Profile image
This method allows you to get the profile image as base64 string.  The method takes an optional 'hash' query parameter which is an MD5 hash of the string.  
The method will return the image string if there is no hash parameter, or the hash parameter does not match the image in the databse.
Otherwise it will return an empty object.

####Request
	POST '/getProfileImage/{userId}'
	{}
	
	POST '/getProfileImage/{userId}?hash=234sldkj234sdf334'
	{}
	
####Response
######If not up to date:
	200 + <image string>
	
######If up to date:
	200 + {}
	
* 400 - userId is invalid
* 403 - not your profile
* 404 - if image not found
* 500 - server error

### Upload a Resource image
This method allows the upload of an image as a base64 string.  The request must be within 200kb, or it will be rejected.
If the image already exists, the method will overwrite it.

####Request
	POST '/uploadResourceImage/{resourceId}'
	{
		"image": <the image string>,
		"hash": <an MD5 hash of the image>
	}

####Response
* 204 - no content if successful
* 400 - if {resourceId} is not valid
* 403 - if not your resource
* 404 - if resource not found
* 500 - server error
* 413 - image is too large


### Get a Resource image
This method allows you to get the resource image as base64 string.  The method takes an optional 'hash' query parameter which is an MD5 hash of the string.  
The method will return the image string if there is no hash parameter, or the hash parameter does not match the image in the databse.
Otherwise it will return an empty object.

####Request
	POST '/getResourceImage/{resourceId}'
	{}
	
	POST '/getResourceImage/{resourceId}?hash=234sldkj234sdf334'
	{}
	
####Response
######If not up to date:
	200 + <image string>
	
######If up to date:
	200 + {}
	
* 403 - not your resource
* 404 - if image not found
* 400 - resourceId is invalid
* 500 - server error
