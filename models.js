var crypto = require('crypto');


function defineModels(mongoose, fn) {
  var Schema = mongoose.Schema,
      ObjectId = Schema.ObjectId;


  // A function used by string fields that are required    
  function validatePresenceOf(value) {
    return value && value.length;
  }

  /**
    * Model: User
    */
  var UserSchema = new Schema({
    'email': { type: String, validate: [validatePresenceOf, 'an email is required'], index: { unique: true } },
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
    })
    .get(function() { return this._password; });

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
    if (!validatePresenceOf(this.password)) {
      next(new Error('Invalid password'));
    } else {
      next();
    }
  });



  /**
    * Model: UserProfile
    */
  var UserProfileSchema = new Schema({
    'userId': { type: String, validate: [validatePresenceOf, 'the profile must belong to a user'], index: {unique: true} },
    'firstName': String,
    'lastName': String, 
    'address': String,
    'city': String,
    'location': Object,
    'resources': [],
    'trades': [],
    'phone': String,
    'email': String,
  });



  /**
    * Model: LoginToken
    *
    * Used for session persistence.
    */
  var LoginTokenSchema = new Schema({
    lastUpdated: { type: Date, index:{expires: 600}}, // expires and is deleted after 10 minutes
    userId: { type: String, index: true },
    token: { type: String, index: true }
  });

  LoginTokenSchema.method('randomToken', function() {
    return Math.round((new Date().valueOf() * Math.random())) + '';
  });

  LoginTokenSchema.method('update',function(){
    // Automatically create the tokens
    if(!this.token){
      this.token = this.randomToken();
    }
    this.lastUpdated = new Date();

    return this.token;
  });


  // create the models
  mongoose.model('User', UserSchema);
  mongoose.model('LoginToken', LoginTokenSchema);
  mongoose.model('UserProfile', UserProfileSchema);

  // callback 
  fn();
}

// declare the defineModels method as accessible as a library function
exports.defineModels = defineModels; 
