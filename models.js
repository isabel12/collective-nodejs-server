var crypto = require('crypto');
var tradeLogic = require('./tradeLogic');


function defineModels(mongoose, fn) {
  var Schema = mongoose.Schema,
      ObjectId = Schema.ObjectId;


  // A function used by string fields that are required    
  function validatePresenceOf(value) {
    return value && value.length;
  }

  function validState(value){

    for (var i = 0; i < states.length; i++) {
      if(states[i] == value.trim().toLowerCase()){
        return true;
      }
    };

    return false;
  }

  //================================================================================================================
  // Return types
  //================================================================================================================

  var ProfileUpdateSchema = new Schema({
    'firstName': String,
    'lastName': String, 
    'address': String,
    'city': String,
    'postcode': String,
    'lookingFor': String,
    'location':Object
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
  * Model: Resource
  */
  var ResourceSchema = new Schema({
    'type': String,
    'title': String,
    'description': String,
    'location': {type: Object, index: { type: '2dsphere', sparse: true }},
    'owner': {type: Schema.Types.ObjectId, ref: 'User'},
    'points': Number
  });


  ResourceSchema.virtual('locationReturnType')
    .get(function(){
      var value = {
        type: this.type, 
        _id:this._id, 
        location: {lat: this.location.coordinates[1], lon: this.location.coordinates[0]}
      };

      return value;
    });

  ResourceSchema.virtual('returnType')
    .get(function(){
      var value = {
        type: this.type, 
        _id:this._id, 
        title: this.title,
        description: this.description,
        owner: this.owner,
        location: {lat: this.location.coordinates[1], lon: this.location.coordinates[0]},
        points: this.points
      };

      return value;
    });



  var reviewComparator = function(a, b){
    console.log('Review date type: ' + typeof a);

    var dateA = dates.convert(a);
    var dateB = dates.convert(b);
    var value = (dates.compare(dateA,dateB)*-1);

    return value;
  }



  /**
    * Model: Trade
    */
  var TradeSchema = new Schema({
    'resource': {type: Schema.Types.ObjectId, ref: 'Resource', index: true},
    'borrower': {'firstName':String, 'lastName':String, 'userId': Schema.Types.ObjectId},
    'owner': {'firstName':String, 'lastName':String, 'userId': Schema.Types.ObjectId},
    'messages': [MessageSchema],
    'state': String,
    'ownerReviewed': Boolean,
    'borrowerReviewed': Boolean,
    '__v': Number,
    'lastUpdated': Date
  });


  TradeSchema.virtual('borrowerId')
    .get(function(){
      return this.borrower.userId;
    });

  TradeSchema.virtual('ownerId')
    .get(function(){
      return this.owner.userId;
    });


  TradeSchema.method('canDoAction', function(userId, action){
    if(userId.equals(this.borrower.userId)){
      return tradeLogic.getBorrowerActions(this.state, this.borrowerReviewed).indexOf(action) > -1;
    } else if (userId.equals(this.owner.userId)){
      return tradeLogic.getOwnerActions(this.state, this.ownerReviewed).indexOf(action) > -1;
    }
    return false;
  });

  TradeSchema.method('isBorrower', function(userId){
    if(userId.equals(this.borrower.userId)){
      return true;
    } 
    return false;
  });

  TradeSchema.method('isOwner', function(userId){
    if(userId.equals(this.owner.userId)){
      return true;
    } 
    return false;
  });


  TradeSchema.virtual('ownerActions')
    .get(function(){
      return tradeLogic.getOwnerActions(this.state, this.ownerReviewed);
    });


  TradeSchema.virtual('borrowerActions')
    .get(function(){
      return tradeLogic.getBorrowerActions(this.state, this.borrowerReviewed);
    });

  TradeSchema.virtual('returnType')
    .get(function(){
      return {
        resourceId: this.resource,
        _id: this._id,
        borrower: this.borrower,
        owner: this.owner,
        state: this.state,
        ownerActions : this.ownerActions,
        borrowerActions : this.borrowerActions,
        messages: this.messages,
        version: this.__v,
        lastUpdated: this.lastUpdated
      };
    });

  /**
    * Model: Message
    */
  var MessageSchema = new Schema({
    'sender': {'firstName':String, 'lastName':String, 'userId': Schema.Types.ObjectId},
    'date': Date,
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
    'numItemsLent': Number,
    'numItemsBorrowed': Number,
    'blackMarks':Number,
    'lookingFor': String,
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
      return this.reviews.length == 0 ? totalRating : (totalRating / this.reviews.length).toFixed(2);
    });  

  UserSchema.virtual('returnType')
  .get(function(){
    var value = {
      _id: this._id,
      email: this.email,
      firstName: this.firstName,
      lastName: this.lastName,
      address: this.address,
      city: this.city,
      postcode: this.postcode,
      lookingFor: this.lookingFor,
      rating: this.rating,
      points: this.points,
      numItemsLent: this.numItemsLent,
      numItemsBorrowed: this.numItemsBorrowed,
      blackMarks: this.blackMarks,
      reviews: this.reviews.reverse()
    };
    return value;
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
  mongoose.model('ProfileUpdate', ProfileUpdateSchema);
  mongoose.model('Resource', ResourceSchema);
  mongoose.model('Trade', TradeSchema);
  mongoose.model('Message', MessageSchema);

  // callback 
  fn();
}

// declare the defineModels method as accessible as a library function
exports.defineModels = defineModels; 


