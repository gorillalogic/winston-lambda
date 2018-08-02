'use strict';

/**
 * Winston module.
 * This code represents a Lambda function to handle backend logic for Winston.
 * Winston is a virtual HR assistant created using Amazon Lex.
 * To know more about Amazon Lex check out {@link https://docs.aws.amazon.com/lex/latest/dg/what-is.html}
 * @summary Backend logic for Winston (Amazon Lex bot).
 * @module winstonbot
 * @author Gorilla Logic
 * @version 1.0.0
 */

const axios = require('axios');
const { WebClient } = require('@slack/client');  // https://github.com/slackapi/node-slack-sdk

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

// ================================ Helper Functions ===================================================================

function parseLocalDate(date) {
   /**
    * Construct a date object in the local timezone by parsing the input date string, assuming a YYYY-MM-DD format.
    * Note that the Date(dateString) constructor is explicitly avoided as it may implicitly assume a UTC timezone.
    */
  const dateComponents = date.split(/\-/);
  return new Date(dateComponents[0], dateComponents[1] - 1, dateComponents[2]);
}

function isValidDate(date) {
  try {
    return !(isNaN(parseLocalDate(date).getTime()));
  } catch (err) {
    return false;
  }
}

/**
 * Returns a string with first letter capitalized.
 * If the first letter of a string is an uppercase letter or a non-alphabetic character,
 * it returns the original string.
 * @param {string} text The string to be capitalized.
 * @return {string} The given text with the first letter capitalized.
 */
const capitalize = function(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

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
}

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
}


/**
 * Filter the given array of objects (timeOffItems) by using 
 * the given PTO type. e.g. 'Vacations', 'PTO', 'Bereavement Leave', etc.
 * @param {Object[]} timeOffItems Array of JSON Objects with time off balances.
 * @param {string} ptoType A string describing the PTO type to use for filtering.
 * @return {object} The object with the given PTO time off balance. It returns undefined if not found.
 */
const filterPTOs = function(timeOffItems, ptoType) {
  let findings = timeOffItems.filter(function(timeOffItem) {
    return timeOffItem.name === ptoType
  });
  if (findings.length > 0) {
    return findings[0];
  }
}


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
}


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
        return
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
}

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
