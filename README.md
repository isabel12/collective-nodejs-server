collective-nodejs-server
========================

Collective uses Basic Authentication - make sure you include the Authorization 
header based on the email and password to access all links (excluding registration).

Also, for POST and PUT, make sure to include the 'Content-Type: application/json' header.

###Register
#####Request
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

#####Response
* 200 - if successful (may be changed to 201 later)
* 400 - if field falidation failed.
* 403 - if an account already exists.
* 500 - if there was a server error.


###View Profile
#####Request
	GET '/user/{id}'
	
#####Response
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

Updates the given profile.  The JSON passed to the method can have as many or few of the required fields - the method will update
with the ones given.  The value of each field is validated, and only the fields that are allowed to be changed will be changed; 
all other fields will be ignored.

#####Request
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
	
#####Response
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



