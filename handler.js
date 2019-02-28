'use strict';

/**
 * Winston module.
 * This code represents a Lambda function to handle backend logic for Winston.
 * Winston is a virtual HR assistant created using Amazon Lex.
 * To know more about Amazon Lex check out {@link https://docs.aws.amazon.com/lex/latest/dg/what-is.html}
 * @summary Backend logic for Winston (Amazon Lex bot).
 * @module winstonbot
 * @author Gorilla Logic
 * @version 1.2.5
 */

const axios = require('axios');
const { WebClient } = require('@slack/client');  // https://github.com/slackapi/node-slack-sdk
const moment = require('moment');
moment().format();
require('moment-weekday-calc');

// ================================ Lex Bot Helpers ===================================================================

/**
 * These functions help you build responses that matches the output format expected by
 * Amazon Lex bots. Each structure is intended to be use on specific cases depending
 * on the conversation flow.
 * To know more about these output formats refer to Lex documentation:
 * {@link https://docs.aws.amazon.com/lex/latest/dg/lambda-input-response-format.html}.
 */

function elicitSlot(sessionAttributes, intentName, slots, slotToElicit, message) {
   return {
     sessionAttributes,
     dialogAction: {
         type: 'ElicitSlot',
         intentName,
         slots,
         slotToElicit,
         message,
     },
   };
}

function close(sessionAttributes, fulfillmentState, message) {
   return {
     sessionAttributes,
     dialogAction: {
         type: 'Close',
         fulfillmentState,
         message,
     },
   };
}

function delegate(sessionAttributes, slots) {
   return {
     sessionAttributes,
     dialogAction: {
         type: 'Delegate',
         slots,
     },
   };
}

function buildValidationResult(isValid, violatedSlot, messageContent) {
  if (messageContent == null) {
      return {
          isValid,
          violatedSlot,
      };
  }
  return {
      isValid,
      violatedSlot,
      message: { contentType: 'PlainText', content: messageContent },
  };
}

// ================================ Helper Stuff ===================================================================
/**
 * Collection of time-off request types from BambooHR.
 * The ids are specific to Gorilla Logic customized settings.
 * You can see the different options by looking at the UI and
 * using this API call: 
 * GET {@link https://api.bamboohr.com/api/gateway.php/gorillalogic/v1/meta/time_off/types/}
 * With the proper API key.
 */
const timeOffTypes = {
  'PTO': 1,
  'Unpaid time off': 6,
  'Bereavement Leave': 3,
  'Paid Marriage Leave': 8,
  'Travel Requests': 7
};

/**
 * Returns a string with first letter capitalized.
 * If the first letter of a string is an uppercase letter or a non-alphabetic character,
 * it returns the original string.
 * @param {string} text The string to be capitalized.
 * @return {string} The given text with the first letter capitalized.
 */
const capitalize = function(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/**
 * Finds a person on the given employees object by matching the displayName field..
 * @param {Object[]} employees Complete list of company employees.
 * @param {string} name The complete name of the employee to search for.
 * @return {Object} The object with the founded person's info. It returns undefined if not found.
 */
const findPerson = function(employees, name) {
  let findings = employees.filter(function (employee) {
    if (employee.displayName === capitalize(name)) {
      return true;
    } else {
      // When not direct match probably display name has two last names
      // but the user only provided one. Test if that is the case
      let displayName = employee.displayName;
      displayName = displayName.substring(0, displayName.lastIndexOf(" "));
      return (displayName === capitalize(name));
    }
  });
  if (findings.length > 0) {
    return findings[0];
  }
};

/**
 * Finds a person on the given employees object by matching the workEmail field..
 * @param {Object[]} employees Complete list of company employees.
 * @param {string} name The complete name of the employee to search for.
 * @return {Object} The object with the founded person's info. It returns undefined if not found.
 */
const findPersonByEmail = function(employees, email) {
  let findings = employees.filter(function (employee) {
    return (employee.workEmail === email);
  });
  if (findings.length > 0) {
    return findings[0];
  }
};

/**
 * Filter the given array of objects (timeOffItems) by using 
 * the given PTO type. e.g. 'Vacations', 'PTO', 'Bereavement Leave', etc.
 * @param {Object[]} timeOffItems Array of JSON Objects with time off balances.
 * @param {string} ptoType A string describing the PTO type to use for filtering.
 * @return {object} The object with the given PTO time off balance. It returns undefined if not found.
 */
const filterPTOs = function(timeOffItems, ptoType) {
  let findings = timeOffItems.filter(function(timeOffItem) {
    return timeOffItem.name === ptoType;
  });
  if (findings.length > 0) {
    return findings[0];
  }
};

/**
 * Returns a pseudo-randomly selected joke about Chuck Norris.
 * @return {string} A joke about Chuck Norris.
 */
const chuckNorrisJoke = function() {
  let jokes = [
    'Chuck Norris doesn\'t flush the toilet...he scares the shit out of it.',
    'Chuck Norris has a grizzly bear carpet in his room. The bear isn\'t dead it is just afraid to move.',
    'Chuck Norris died 20 years ago, Death just hasn\'t built up the courage to tell him yet.',
    'While learning CPR Chuck Norris actually brought the practice dummy to life.',
    'Chuck Norris has already been to Mars; that\'s why there are no signs of life.',
    'Chuck Norris and Superman once fought each other on a bet. The loser had to start wearing his underwear on the outside of his pants.',
    'Chuck norris went skydiving and his parachute failed to open, so he took it back the next day for a refund.',
    'Chuck Norris doesn\'t dial the wrong number, you pick up the wrong phone.',
    'Did you know Chuck Norris had a role in Star Wars?. He was the force.',
    'Chuck Norris will never have a heart attack. His heart isn\'t nearly foolish enough to attack him.',
    'Before going to bed, the Boogeyman always checks his closet for Chuck Norris.',
    'Chuck Norris counted to infinity - twice.',
    'Chuck Norris uses a stunt double during crying scenes.',
    'Voldemort refers to Chuck Norris as "You Know Who."',
    'When Chuck Norris does a push up, he isn\'t lifting himself up, he\'s pushing the Earth down.',
    'Death once had a near Chuck Norris experience.',
    'Chuck Norris frequently donates blood to the Red Cross. Just never his own.',
    'Chuck Norris can light a fire by rubbing two ice-cubes together.',
    'Chuck Norris once went to court for a crime, the judge pleaded guilty.',
    'Chuck Norris ordered a Big Mac at Burger King, and got one.',
    'Chuck Norris can pick oranges from an apple tree and make the best lemonade youve ever tasted.',
    'Chuck Norris protects his body guards.',
    'Chuck Norris makes onions cry.',
    'Chuck Norris won the Boston marathon in New York.',
    'Chuck Norris knows Victoria\'s secret.'
  ];
  return jokes[Math.floor(Math.random() * jokes.length)];
};


// ================================ BambooHR API ============================================================================
const subDomain = 'gorillalogic';

/**
 * Base configuration for BambooHR API requests
 */
const bambooAPI = axios.create({
  baseURL: 'https://api.bamboohr.com/api/gateway.php/'+subDomain,
  auth: {
    username: process.env.bambooApiKey,
    password: 'x'
  },
  timeout: 6000,
  headers: {
    'accept': 'application/json',
    'accept-encoding': 'gzip, deflate',
    'accept-language': 'en-US,en;q=0.8'
  }
});

/**
 * Gets the complete list of employees from the BambooHR system.
 * @param {function} doSomething Callback function expected to do something with the list of employees
 */
const getEmployees = function (doSomething) {
  bambooAPI.get('/v1/employees/directory')
  .then(function (response) {
    doSomething(response.data.employees);
  })
  .catch(function (error) {
    console.log(error);
  });
};

/**
 * Get a list of who's out, including company holidays.
 * We use this API request to get the official company holidays as it's the only way
 * @param {string} start Start date for the query request
 * @param {string} end End date for the query request
 * @param {function} doSomething Callback function expected to do something with the result
 */
const whosOut = function (start, end, doSomething) {
  bambooAPI.get(`/v1/time_off/whos_out?start=${start}&end=${end}`)
  .then(function (response) {
    doSomething(response.data);
  })
  .catch(function (error) {
    console.log(error);
  });
};


// ================================ Functions to handle intents =============================================================

/**
 * Gets the timeoff balance of a given employee
 * @param {Object} intentRequest Intent request information
 * @param {function} callback Callback function to handle the response
 */
const getTimeOffBalance = function (intentRequest, callback) {
  /**
   * @todo: Check if the request actually came from Slack.
   * Under requestAttributes (from event) you can check the presence of
   * x-amz-lex:channel-type. 
   * The value will be Slack if the user comes from slack.
   */
  let userId = intentRequest.userId;
  // Extract userId needed by Slack API
  userId = userId.slice(userId.lastIndexOf(':') + 1);

  // An access token (from your Slack app or custom integration - xoxp, xoxb, or xoxa)
  const token = process.env.slackApiToken;
  const web = new WebClient(token);

  // Request Slack API to extract the email from the user Id
  let slackEmail = '';
  web.users.profile.get({ user: userId })
  .then((res) => {
    slackEmail = res.profile.email;
  })
  .catch(console.error);

  // We assume the request to get the employees from BambooHR will give
  // time to the previous request to fulfill therefore enforcing concurrency
  // @todo: handle the concurrency properly

  getEmployees( function(employees) {
    var person = findPersonByEmail(employees, slackEmail);

    if (person === undefined) {
      console.log(`Sorry, ${slackEmail} could not be found`);
      callback(close(intentRequest.sessionAttributes, 'Fulfilled',
      { 
        contentType: 'PlainText',
        content: `Sorry, ${slackEmail} could not be found.` 
      }));
      return;
    }

    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth()+1; //January is 0!
    var yyyy = today.getFullYear();

    bambooAPI.get('/v1/employees/'+person.id+'/time_off/calculator/?end='+yyyy+ '-'+mm+'-'+dd)
    .then(function (response) {
      let ptos = filterPTOs(response.data, 'PTO'); //Filter time off by PTO
      let employeeName = person.displayName;

      if (ptos === undefined) {
        console.log(`Sorry, could not found PTO information for ${employeeName}`);
        callback(close(intentRequest.sessionAttributes, 'Fulfilled',
        { 
          contentType: 'PlainText',
          content: `Sorry, could not found PTO information for ${employeeName}` 
        }));
        return;
      }

      // Success - answer to the user with the PTO days
      callback(close(intentRequest.sessionAttributes, 'Fulfilled',
      { 
        contentType: 'PlainText',
        content: `${employeeName} you have ${ptos.balance} ${ptos.units} left` 
      }));
    })
    .catch(function (error) {
      console.log(error);
    });
  });
};

/**
 * Response with a pseudo-randomly selected joke about Chuck Norris.
 * @param {Object} intentRequest Intent request information
 * @param {function} callback Callback function to handle the response
 */
const tellAJokeAboutChuckNorris = function(intentRequest, callback) {
  let joke = chuckNorrisJoke();
  // Success - answer to the user with the PTO days
  callback(close(intentRequest.sessionAttributes, 'Fulfilled',
  { 
    contentType: 'PlainText',
    content: joke 
  }));
};

/**
 * Validates the provided input slots from the user and returns a validation object
 * with a boolean value describing if validation passed and the violated slot and
 * the error message to be sent back to the user.
 * @param {String} typeOfTimeOff Type of timeoff requested. Uses a custom slot type from the Lex bot.
 * @param {String} startDate The stard date in the form YYYY-MM-DD.
 * @param {String} endDate The end date in the form YYYY-MM-DD.
 */
const validateTimeOffRequest = function(typeOfTimeOff, startDate, endDate) { 
  if (typeOfTimeOff && Object.keys(timeOffTypes).indexOf(typeOfTimeOff) === -1) {
    return buildValidationResult(false, 'typeOfTimeOff', `Sorry I can't create a time off request for ${typeOfTimeOff}, would you like a different type of time off?`);
  }
  if (startDate) {
    if (new Date(startDate) < new Date()) {
        return buildValidationResult(false, 'startDate', `I can't schedule a time off request in the past! Can you provide a different date?`);
    }
  }
  if (endDate) {
    if (new Date(endDate) < new Date(startDate)) {
      return buildValidationResult(false, 'endDate', 'Your return date must be after your leave date! Can you try a different date?');
    }
  }
  return buildValidationResult(true, null, null);
};

/**
 * Handle the intent of a user trying to create a new time off request.
 * @param {Object} intentRequest Intent requet information
 * @param {function} callback Callback function to handle the response
 */
const createTimeOffRequest = function(intentRequest, callback) {
  const typeOfTimeOff = intentRequest.currentIntent.slots.typeOfTimeOff;
  const startDate = intentRequest.currentIntent.slots.startDate;
  const endDate = intentRequest.currentIntent.slots.endDate;
  // Session attributes from the intent.
  var outputSessionAttributes = intentRequest.sessionAttributes;

  if (intentRequest.invocationSource === 'DialogCodeHook') {
    // Perform basic validation on the supplied input slots. 
    // Use the elicitSlot dialog action to re-prompt for the first violation detected.
    const slots = intentRequest.currentIntent.slots;
    const validationResult = validateTimeOffRequest(typeOfTimeOff, startDate, endDate);
    if (!validationResult.isValid) {
        slots[`${validationResult.violatedSlot}`] = null;
        callback(elicitSlot(intentRequest.sessionAttributes, intentRequest.currentIntent.name, slots, validationResult.violatedSlot, validationResult.message));
        return;
    }

    if (startDate && endDate) {
      // @hack: For some reason this came null on Slack tests
      if (!outputSessionAttributes) {
        outputSessionAttributes = { displayStart:'', displayEnd: '' };
      }
      outputSessionAttributes.displayStart = moment(startDate).format('dddd, MMMM Do YYYY');
      outputSessionAttributes.displayEnd = moment(endDate).format('dddd, MMMM Do YYYY');
    }
    callback(delegate(outputSessionAttributes, intentRequest.currentIntent.slots));
    return;
  }

  let userId = intentRequest.userId;
  // Extract userId needed by Slack API
  userId = userId.slice(userId.lastIndexOf(':') + 1);

  // An access token (from your Slack app or custom integration - xoxp, xoxb, or xoxa)
  const token = process.env.slackApiToken;
  const web = new WebClient(token);

  // Request Slack API to extract the email from the user Id
  let slackEmail = '';
  web.users.profile.get({ user: userId })
  .then((res) => {
    slackEmail = res.profile.email;
  })
  .catch(console.error);

  getEmployees( function(employees) {
    var person = findPersonByEmail(employees, slackEmail);

    if (person === undefined) {
      console.log(`Sorry, ${slackEmail} could not be found`);
      callback(close(intentRequest.sessionAttributes, 'Fulfilled',
      { 
        contentType: 'PlainText',
        content: `Sorry, ${slackEmail} could not be found.` 
      }));
      return;
    }

    // Calculate the amount of working days to request
    if (startDate && endDate) {
      whosOut( startDate, endDate, function(response) {
        // Filter non-holidays elements from this 
        // response and put the dates for company
        // holidays into an array.
        let items = response.filter(function (item) {
            return (item.type === 'holiday');
        });
        let holidays = [];
        items.forEach(item => {
            holidays.push(item.start);
        });
        
        // Calculate the amount of working days
        // between the two specified dates excluding
        // weekends and company holidays
        let amount = moment().isoWeekdayCalc({  
            rangeStart: startDate,  
            rangeEnd: endDate,  
            weekdays: [1,2,3,4,5],  
            exclusions: holidays
        });

        let timeOffTypeValue = timeOffTypes[typeOfTimeOff];
        let xmlData = `<request>
                          <status>requested</status>
                          <start>${startDate}</start>
                          <end>${endDate}</end>
                          <timeOffTypeId>${timeOffTypeValue}</timeOffTypeId>
                          <amount>${amount}</amount>
                      </request>`;

        console.log(xmlData);

        // Send the time-off request to BambooHR API
        bambooAPI.put('/v1/employees/'+person.id+'/time_off/request/', 
        xmlData,
        {headers:
          {'Content-Type': 'text/xml'}
        })
        .then(function (response) {
          let approver = response.data.approvers[0].displayName;
          let content = `OK ${person.firstName}, I have sent your request. Please wait for approval.`;
          if (approver !== '') {
            content = `OK ${person.firstName}, I have sent your request. Please wait for approval from ${approver}.`;
          }
          // Fulfill the request
          callback(close(intentRequest.sessionAttributes, 'Fulfilled',
          { 
            contentType: 'PlainText',
            content: content 
          }));
        })
        .catch(function (error) {
          console.log(error);
          // Fulfill the request
          callback(close(intentRequest.sessionAttributes, 'Fulfilled',
          { 
            contentType: 'PlainText',
            content: `Sorry your request failed. I got this error: ${error}.` 
          }));
        });
        
        // Fulfill the request
        /*callback(close(intentRequest.sessionAttributes, 'Fulfilled',
        { 
          contentType: 'PlainText',
          content: `Ok, sent - testing completed` 
        }));*/
      });
    }    
  });
};

// ================================ Intent dispatching ===================================================================

/**
* Route the incoming request based on intent.
* If Intent is not recognize then respond with an error.
* @param {object} intentRequest JSON object with request information
* @param {function} callback function that handle the response to the lex bot
*/
function dispatch(intentRequest, callback) {
  console.log(`dispatch intentName=${intentRequest.currentIntent.name}`);

  const intentName = intentRequest.currentIntent.name;

  // Dispatch to the corresponding intent handler
  if (intentName === 'TimeOffPTOBalance') {
    return getTimeOffBalance(intentRequest, callback);
  } else if (intentName === 'FunChuckNorrisJokes') {
    return tellAJokeAboutChuckNorris(intentRequest, callback);
  } else if (intentName === 'CreatePTORequest') {
    return createTimeOffRequest(intentRequest, callback);
  }
  // If Intent is not recognize then respond with an error
  throw new Error(`Intent with name ${intentName} not supported`);
}

// ================================ Main bot handler ==================================================================

/**
 * Handle Amazon Lex bot logic for Winston.
 * Winston is virtual HR assitant.
 * @module winstonbot
 */
module.exports.winstonbot = (event, context, callback) => {
  try {
    console.log(`event.bot.name=${event.bot.name}`);

    /**
     * Sanity check to prevent others for invoking this Lambda function
     * outside the intended bot
     */
    if (event.bot.name !== 'Winston') {
      callback('Invalid Bot Name');
    }

    dispatch(event, (response) => callback(null, response));
  } catch (err) {
      callback(err);
  }
};
