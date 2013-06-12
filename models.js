var crypto = require('crypto'),
    User,
    LoginToken;


function defineModels(mongoose, fn) {
  var Schema = mongoose.Schema,
      ObjectId = Schema.ObjectId;


  /**
    * Model: User
    */
  function validatePresenceOf(value) {
    return value && value.length;
  }

  User = new Schema({
    'email': { type: String, validate: [validatePresenceOf, 'an email is required'], index: { unique: true } },
    'hashed_password': String,
    'salt': String
  });

  User.virtual('id')
    .get(function() {
      return this._id.toHexString();
    });

  User.virtual('password')
    .set(function(password) {
      this._password = password;
      this.salt = this.makeSalt();
      this.hashed_password = this.encryptPassword(password);
    })
    .get(function() { return this._password; });

  User.method('authenticate', function(plainText) {
    return this.encryptPassword(plainText) === this.hashed_password;
  });
  
  User.method('makeSalt', function() {
    return Math.round((new Date().valueOf() * Math.random())) + '';
  });

  User.method('encryptPassword', function(password) {
    return crypto.createHmac('sha1', this.salt).update(password).digest('hex');
  });

  User.pre('save', function(next) {
    if (!validatePresenceOf(this.password)) {
      next(new Error('Invalid password'));
    } else {
      next();
    }
  });

  /**
    * Model: LoginToken
    *
    * Used for session persistence.
    */
  LoginToken = new Schema({
    lastUpdated: { type: Date, index:{expires: 600}}, // expires and is deleted after 10 minutes
    userId: { type: String, index: true },
    token: { type: String, index: true }
  });

  LoginToken.method('randomToken', function() {
    return Math.round((new Date().valueOf() * Math.random())) + '';
  });

  LoginToken.method('update',function(){
    // Automatically create the tokens
    if(!this.token){
      this.token = this.randomToken();
    }
    this.lastUpdated = new Date();

    return this.token;
  });

  LoginToken.virtual('id')
    .get(function() {
      return this._id.toHexString();
    });

  mongoose.model('User', User);
  mongoose.model('LoginToken', LoginToken);

  fn();
}

exports.defineModels = defineModels; 