    var states = {
      PENDING_ACCEPTED : 'p_accepted',
      ACCEPTED : 'accepted',
      DECLINED : 'declined',
      PENDING_CANCELLED : 'p_cancelled',
      CANCELLED : 'cancelled',
      PENDING_COMPLETE_BORROWER : 'p_complete_borrower',
      PENDING_COMPLETE_OWNER : 'p_complete_owner',
      PROCESSING: 'processing',
      COMPLETE : 'complete',
      FAILED : 'failed'
    }  


    var actions = {
      ADD_MESSAGE : 'add_message',
      CANCEL : 'cancel',
      AGREE : 'agree',
      DISAGREE : 'disagree',
      MARK_AS_COMPLETE : 'mark_as_complete',
      MARK_AS_FAILED : 'mark_as_failed',
      ACCEPT : 'accept',
      DECLINE : 'decline'
    }


    var isValidAction = function(action){
        for (var key in actions) {
            if(actions[key] == action){
                return true;
            }
        };
        return false;
    }

    var isValidState = function(state){
        for (var key in states) {
            if(states[key] == state){
                return true;
            }
        };
        return false;
    }

    var getBorrowerActions = function(state, borrowerHasReviewed){

      if(state == states.PENDING_ACCEPTED){
        return [actions.ADD_MESSAGE];
      } 

      if(state == states.ACCEPTED){
        return [actions.CANCEL, actions.MARK_AS_COMPLETE, actions.ADD_MESSAGE];
      } 

      if(state == states.PENDING_CANCELLED){
        return [actions.ADD_MESSAGE];
      } 

      if(state == states.PENDING_COMPLETE_BORROWER){
        return [actions.ADD_MESSAGE];
      } 

      if(state == states.PENDING_COMPLETE_OWNER){
        return [actions.AGREE, actions.DISAGREE, actions.ADD_MESSAGE];
      } 

      if(state == states.COMPLETE || state == states.CANCELLED){
        if(!borrowerHasReviewed){
          return [actions.REVIEW];
        }
        return [];
      } 

      if(state == states.DECLINED || state == states.FAILED || state == states.PROCESSING){
        return [];
      } 

    }

    var getOwnerActions = function(state, ownerHasReviewed){
      if(state == states.PENDING_ACCEPTED){
        return [actions.ACCEPT, actions.DECLINE, actions.ADD_MESSAGE];
      } 

      if(state == states.ACCEPTED){
        return [actions.CANCEL, actions.MARK_AS_COMPLETE, actions.MARK_AS_FAILED, actions.ADD_MESSAGE];
      } 

      if(state == states.PENDING_CANCELLED){
        return [actions.AGREE, actions.DISAGREE, actions.ADD_MESSAGE];
      } 

      if(state == states.PENDING_COMPLETE_BORROWER){
        return [actions.AGREE, actions.DISAGREE, actions.ADD_MESSAGE];
      } 

      if(state == states.PENDING_COMPLETE_OWNER){
        return [actions.ADD_MESSAGE];
      } 

      if(state == states.CANCELLED || state == states.COMPLETE || state == states.FAILED){
        if(!ownerHasReviewed){
          return [actions.REVIEW];
        }
        return [];
      } 

      if(state == states.DECLINED || state == states.PROCESSING){
        return [];
      } 

    }


    // declare enums
    exports.states = states;
    exports.actions = actions;
    exports.getBorrowerActions = getBorrowerActions;
    exports.getOwnerActions = getOwnerActions;
    exports.isValidState = isValidState;
    exports.isValidAction = isValidAction;