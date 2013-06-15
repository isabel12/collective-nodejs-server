var crypto = require('crypto');


function defineModels(mongoose, fn) {
  var Schema = mongoose.Schema,
      ObjectId = Schema.ObjectId;


  // A function used by string fields that are required    
  function validatePresenceOf(value) {
    return value && value.length;
  }

  //================================================================================================================
  // Return types
  //================================================================================================================
  var RTProfileSchema = new Schema({
    'email': String,
    'firstName': String,
    'lastName': String, 
    'address': String,
    'city': String,
    'postcode': String,
    'lookingFor': String,
    'rating': Number,
    'points': Number,
    'reviews': [ReviewSchema]
  });

  //================================================================================================================


  /**
    * Model: Review
    */
  var ReviewSchema = new Schema({
    'date': Date,
    'tradeId': String,
    'reviewer': {'firstName':String, 'lastName':String, 'userId': String},
    'score': {type: Number, min: 0, max: 5},
    'message': String
  });


  /**
    * Model: User
    */
  var UserSchema = new Schema({
    'email': { type: String, validate: [validatePresenceOf, 'an email is required'], index: { unique: true } },
    'firstName': String,
    'lastName': String, 
    'address': String,
    'city': String,
    'postcode': String,
    'location': Object,
    'points': Number,
    'lookingFor': String,
    'resources': [],
    'trades': [],
    'reviews':[ReviewSchema],
    'hashed_password': String,
    'salt': String
  });

  UserSchema.virtual('id')
    .get(function() {
      return this._id.toHexString();
    });

  UserSchema.virtual('password')
    .set(function(password) {
      this._password = password;
      this.salt = this.makeSalt();
      this.hashed_password = this.encryptPassword(password);
    });

  UserSchema.virtual('rating')
    .get(function() {
      var totalRating = 0.0;
      for (var i = 0; i < this.reviews.length; i++) {
        totalRating += this.reviews[i].score ? this.reviews[i].score : 0;
      };
      return (totalRating / this.reviews.length).toFixed(2);
    });  

  UserSchema.method('authenticate', function(plainText) {
    return this.encryptPassword(plainText) === this.hashed_password;
  });
  
  UserSchema.method('makeSalt', function() {
    return Math.round((new Date().valueOf() * Math.random())) + '';
  });

  UserSchema.method('encryptPassword', function(password) {
    return crypto.createHmac('sha1', this.salt).update(password).digest('hex');
  });

  UserSchema.pre('save', function(next) {
    if (!validatePresenceOf(this.hashed_password)) {
      next(new Error('User must have a password.'));
    } else {
      next();
    }
  });


  // create the models
  mongoose.model('User', UserSchema);
  mongoose.model('Review', ReviewSchema);
  mongoose.model('RTProfile', RTProfileSchema);

  // callback 
  fn();
}

// declare the defineModels method as accessible as a library function
exports.defineModels = defineModels; 
