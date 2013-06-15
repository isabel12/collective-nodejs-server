var Validator = require('jsonschema/lib/validator');

var locationSchema = {
	"id":"/Location",
	"type": "object",
	"properties": {
		"lat": {"type": "number", "required": true, "minimum": -90, "maximum": 90},
		"lon": {"type": "number", "required": true, "minimum": -180, "maximum": 180},
	}
};


var registerProfileSchema = {
	"id":"/ProfileRegister",
	"type":"object",
	"properties":{
		"email": {"type": "string", "required": true, "pattern": /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,4}$/},
		"password": {"type": "string", "required": true},
		"firstName": {"type": "string", "required": true},
		"lastName": {"type": "string", "required": true},
		"address": {"type": "string", "required": true},
		"city": {"type": "string", "required": true, "pattern": /^[A-Za-z]{3,20}\ ?([A-Za-z]{3,20})?$/},
		"postcode": {"type": "string", "required": true, "pattern": /^[1-9][0-9]{3}$/},
		"location": {"$ref": "/Location", "required": true}
	}

};


var updateProfileSchema = {
	"id":"/ProfileUpdate",
	"type":"object",
	"properties":{
		"password": {"type": "string"},
		"firstName": {"type": "string"},
		"lastName": {"type": "string"},
		"address": {"type": "string"},
		"city": {"type": "string", "pattern": /^[A-Za-z]{3,20}\ ?([A-Za-z]{3,20})?$/},
		"postcode": {"type": "string",  "pattern": /^[1-9][0-9]{3}$/},
		"location": {"$ref": "/Location", }
	}
};



// A method that allows validating of JSON files.
function validateJSON(body, schemaName){
	var v = new Validator();
	v.addSchema(locationSchema, '/Location');
	v.addSchema(updateProfileSchema, '/ProfileUpdate');
	v.addSchema(registerProfileSchema, '/ProfileRegister');

	var validateResult = v.validate(body, registerProfileSchema);
	if (validateResult.length){
		console.log(validateResult);
		return validateResult[0].property.replace("instance.", "") + " is invalid.";
	}

	return null;
}

exports.validateJSON = validateJSON;
exports.UpdateProfileSchema = updateProfileSchema;
exports.RegisterProfileSchema = registerProfileSchema;


