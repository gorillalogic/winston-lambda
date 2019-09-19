'use strict';

/**
 * Winston module.
 * This code represents a Lambda function to handle backend logic for Winston.
 * Winston is a virtual HR assistant created using Amazon Lex.
 * To know more about Amazon Lex check out {@link https://docs.aws.amazon.com/lex/latest/dg/what-is.html}
 * @summary Backend logic for Winston (Amazon Lex bot).
 * @module winstonbot
 * @author Gorilla Logic
 */

const moment = require('moment');
moment().format();
require('moment-weekday-calc');

// ================================ Intent dispatching ===================================================================

/**
 * Route the incoming request based on intent.
 * If Intent is not recognized then respond with an error.
 * @param {object} intentRequest JSON object with request information
 * @param {function} callback function that handle the response to the lex bot
 */
function dispatch(intentRequest, callback) {
  console.log(`dispatch intentName=${intentRequest.currentIntent.name}`);

  const intentName = intentRequest.currentIntent.name;

  // Dispatch to the corresponding intent handler
  if (intentName === 'TimeOffPTOBalance') {
    return require('./intents/getTimeOffBalance')(intentRequest, callback);
  } else if (intentName === 'FunChuckNorrisJokes') {
    return require('./intents/tellAJokeAboutChuckNorris')(
      intentRequest,
      callback
    );
  } else if (intentName === 'CreatePTORequest') {
    return require('./intents/createTimeOffRequest')(intentRequest, callback);
  } else if (intentName === 'UpdateLicensePlateNumber') {
    return require('./intents/updateLicensePlate')(intentRequest, callback);
  } else if (intentName === 'InfoEmployeesCount') {
    return require('./intents/countGorillas');
  } else if (intentName === 'LunchPerkMenu') {
    return require('./intents/getRestaurantMenu')(intentRequest, callback);
  } else if (intentName === 'InfoWellnessActivity') {
    return require('./intents/getInformationAboutWellnessActivities')(
      intentRequest,
      callback
    );
  }

  // If Intent is not recognize then respond with an error
  throw new Error(`Intent with name ${intentName} not supported`);
}

// ================================ Main bot handler ==================================================================

/**
 * Handle Amazon Lex bot logic for Winston.
 * Winston is virtual HR assistant.
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
    dispatch(event, response => callback(null, response));
  } catch (err) {
    callback(err);
  }
};
