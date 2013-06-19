collective-nodejs-server
========================

Collective uses Basic Authentication - make sure you include the Authorization 
header based on the email and password to access all links (excluding registration).

Also, for POST and PUT, make sure to include the 'Content-Type: application/json' header.



## API Methods
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
* 201 - if successful (may be changed to 204 later)
* 400 - if field falidation failed.
* 403 - if an account already exists.
* 500 - if there was a server error.


###View Profile
####Request
	GET '/user/{id}'
	
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
		"postcode":"6021"
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
* Not locked down yet - will eventually check that it is one of the supported types
* Automatically decapitalised

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

	GET '/resources'
	
	eg:
	 	/resources?lat=-41.315011&lon=174.778131&radius=800
		/resources?lat=-41.315011&lon=174.778131&radius=800&filter=tools
 		/resources?lat=-41.315011&lon=174.778131&radius=800&filter=tools&filter=compost
		/resources?lat=-41.315011&lon=174.778131&radius=200&filter=tools&searchterm=spade
	
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


