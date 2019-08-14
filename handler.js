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
const { google } = require('googleapis');

const { bambooAPIMethods } = require('./api/bamboo');
const { parkingAPIMethods } = require('./api/parking');
const { slackAPIMethods } = require('./api/slack');
const { numbersAPIMethods } = require('./api/numbers');
const googleCalendar = require('./api/google/calendar');

const lex = require('./helpers/lex');
const bamboo = require('./helpers/bamboo');
const slack = require('./helpers/slack');
const foodBonus = require('./helpers/foodBonus');
const wellness = require('./helpers/wellness');

const dateFormatters = require('./helpers/formatters/date');
const random = require('./helpers/random');

moment().format();
require('moment-weekday-calc');

// ================================ Functions to handle intents =============================================================

/**
 * Gets the timeoff balance of a given employee
 * @param {Object} intentRequest Intent request information
 * @param {function} callback Callback function to handle the response
 */
const getTimeOffBalance = async function(intentRequest, callback) {
  const userId = slack.getSlackUserId(intentRequest);
  // Request Slack API to extract the email from the user Id
  let userProfile = null;
  let person = null;
  try {
    userProfile = await slackAPIMethods.getSlackUserProfile(userId);
    const getEmployeesResult = await bambooAPIMethods.getEmployees();

    const slackEmail = userProfile.profile.email;
    const { employees } = getEmployeesResult.data;
    const [personResult] = employees.filter(e => e.workEmail === slackEmail);

    if (personResult === undefined) {
      const err = `Sorry, ${slackEmail} could not be found`;
      throw err;
    }
    person = personResult;
  } catch (error) {
    console.log(error);
    lex.fulfillWithError(intentRequest, callback, error);
    return;
  }

  const today = new Date();
  const dd = today.getDate();
  const mm = today.getMonth() + 1; //January is 0!
  const yyyy = today.getFullYear();

  try {
    const response = await bambooAPIMethods.calculateTimeOffBalance(
      person.id,
      yyyy,
      mm,
      dd
    );
    const [ptos] = response.data.filter(t => t.name === 'PTO');
    const employeeName = person.displayName;
    if (ptos === undefined) {
      console.log(`Sorry, could not found PTO information for ${employeeName}`);
      return;
    }
    // Success - answer to the user with the PTO days
    const message = `${employeeName} you have ${ptos.balance} ${ptos.units} left`;
    console.log(message);
    lex.fulfillWithSuccess(intentRequest, callback, message);
  } catch (error) {
    console.log(error);
    lex.fulfillWithError(intentRequest, callback, error);
  }
};

/**
 * Response with a pseudo-randomly selected joke about Chuck Norris.
 * @param {Object} intentRequest Intent request information
 * @param {function} callback Callback function to handle the response
 */
const tellAJokeAboutChuckNorris = (intentRequest, callback) => {
  const jokes = require('./chucknorris.json');
  const joke = random.shuffleAndPickOne(jokes);
  lex.fulfillWithSuccess(intentRequest, callback, joke);
};

/**
 * Validates the provided input slots from the user and returns a validation object
 * with a boolean value describing if validation passed and the violated slot and
 * the error message to be sent back to the user.
 * @param {String} typeOfTimeOff Type of timeoff requested. Uses a custom slot type from the Lex bot.
 * @param {String} startDate The start date in the form YYYY-MM-DD.
 * @param {String} endDate The end date in the form YYYY-MM-DD.
 */
const validateTimeOffRequest = function(typeOfTimeOff, startDate, endDate) {
  if (
    typeOfTimeOff &&
    Object.keys(bamboo.timeOffTypes).indexOf(typeOfTimeOff) === -1
  ) {
    return lex.buildValidationResult(
      false,
      'typeOfTimeOff',
      `Sorry I can't create a time off request for ${typeOfTimeOff}, would you like a different type of time off?`
    );
  }
  if (startDate) {
    if (new Date(startDate) < new Date()) {
      return lex.buildValidationResult(
        false,
        'startDate',
        `I can't schedule a time off request in the past! Can you provide a different date?`
      );
    }
  }
  if (endDate) {
    if (new Date(endDate) < new Date(startDate)) {
      return lex.buildValidationResult(
        false,
        'endDate',
        'Your return date must be after your leave date! Can you try a different date?'
      );
    }
  }
  return lex.buildValidationResult(true, null, null);
};

/**
 * Handle the intent of a user trying to create a new time off request.
 * @todo Refactor this code for a more readable version. Take a look at updateLicensePlate
 * @param {Object} intentRequest Intent request information
 * @param {function} callback Callback function to handle the response
 */
const createTimeOffRequest = async function(intentRequest, callback) {
  const {
    typeOfTimeOff,
    startDate,
    endDate,
  } = intentRequest.currentIntent.slots;
  // Session attributes from the intent.
  var outputSessionAttributes = intentRequest.sessionAttributes;

  if (intentRequest.invocationSource === 'DialogCodeHook') {
    // Perform basic validation on the supplied input slots.
    // Use the elicitSlot dialog action to re-prompt for the first violation detected.
    const { slots } = intentRequest.currentIntent;
    const validationResult = validateTimeOffRequest(
      typeOfTimeOff,
      startDate,
      endDate
    );
    if (!validationResult.isValid) {
      slots[`${validationResult.violatedSlot}`] = null;
      callback(
        lex.elicitSlot(
          intentRequest.sessionAttributes,
          intentRequest.currentIntent.name,
          slots,
          validationResult.violatedSlot,
          validationResult.message
        )
      );
      return;
    }

    if (startDate && endDate) {
      // @hack: For some reason this came null on Slack tests
      if (!outputSessionAttributes) {
        outputSessionAttributes = { confirmationPrompt: '' };
      }
      const displayStart = moment(startDate).format('dddd, MMMM Do YYYY');
      const displayEnd = moment(endDate).format('dddd, MMMM Do YYYY');

      let confirmationPrompt = `Can you confirm your ${typeOfTimeOff} request from ${displayStart} to ${displayEnd}?`;
      if (startDate === endDate) {
        confirmationPrompt = `Can you confirm your ${typeOfTimeOff} request for ${displayStart}?`;
      }

      outputSessionAttributes.confirmationPrompt = confirmationPrompt;
    }
    callback(
      lex.delegate(outputSessionAttributes, intentRequest.currentIntent.slots)
    );
    return;
  }

  const userId = slack.getSlackUserId(intentRequest);
  // Request Slack API to extract the email from the user Id
  let userProfile = null;
  let person = null;
  try {
    userProfile = await slackAPIMethods.getSlackUserProfile(userId);
    const getEmployeesResult = await bambooAPIMethods.getEmployees();

    const slackEmail = userProfile.profile.email;
    const { employees } = getEmployeesResult.data;
    [person] = employees.filter(e => e.workEmail === slackEmail);
    if (person === undefined) {
      const err = `Sorry, ${slackEmail} could not be found`;
      throw err;
    }
  } catch (error) {
    console.log(error);
    lex.fulfillWithError(intentRequest, callback, error);
    return;
  }

  // Calculate the amount of working days to request
  if (startDate && endDate) {
    const result = await bambooAPIMethods.whosOut(startDate, endDate);
    const response = result.data;
    // Filter non-holidays elements from this
    // response and put the dates for company
    // holidays into an array.
    const items = response.filter(item => {
      return item.type === 'holiday';
    });
    const holidays = [];
    items.forEach(item => {
      holidays.push(item.start);
    });

    // Calculate the amount of working days
    // between the two specified dates excluding
    // weekends and company holidays
    const amount = moment().isoWeekdayCalc({
      rangeStart: startDate,
      rangeEnd: endDate,
      weekdays: [1, 2, 3, 4, 5],
      exclusions: holidays,
    });

    const timeOffTypeValue = bamboo.timeOffTypes[typeOfTimeOff];

    try {
      const response = await bambooAPIMethods.sendTimeOffRequest(
        person.id,
        startDate,
        endDate,
        timeOffTypeValue,
        amount
      );
      const approver = response.data.approvers[0].displayName;
      let content = `OK ${person.firstName}, I have sent your request. Please wait for approval.`;
      if (approver !== '') {
        content = `OK ${person.firstName}, I have sent your request. Please wait for approval from ${approver}.`;
      }
      // Fulfill the request
      lex.fulfillWithSuccess(intentRequest, callback, content);
    } catch (error) {
      console.log(error);
      lex.fulfillWithError(intentRequest, callback, error);
    }
  }
};

/**
 * Updates an existing license plate number for the parking bot.
 * It first request the user information from Slack API to retrieve
 * the username which is one of the requirements to update the
 * plate using the parking bot API.
 * @param {Object} intentRequest Intent request information
 * @param {function} callback Callback function to handle the response
 */
const updateLicensePlate = async function(intentRequest, callback) {
  const { previousPlate, newPlate } = intentRequest.currentIntent.slots;

  if (!previousPlate || !newPlate) {
    const errorMessage = `Something failed with arguments previousPlate: ${previousPlate} or newPlate: ${newPlate}`;
    console.log(errorMessage);
    lex.fulfillWithError(intentRequest, callback, errorMessage);
  }

  const userId = slack.getSlackUserId(intentRequest);
  let userInfo = null;
  try {
    // Retrieve user information from Slack using the SDK
    userInfo = await slack.getSlackUserInfo(userId);
  } catch (error) {
    console.log(error);
    lex.fulfillWithError(
      intentRequest,
      callback,
      "Failed to retrieve user's info from Slack"
    );
    return;
  }

  try {
    const res = await parkingAPIMethods.updateExistingPlate({
      previousPlate: previousPlate.toUpperCase(),
      newPlate: newPlate.toUpperCase(),
      username: userInfo.user.name,
    });
    console.log(res.data);
    const message = `Your plate number was updated to ${res.data.newPlate}.`;
    lex.fulfillWithSuccess(intentRequest, callback, message);
  } catch (error) {
    console.log(error);
    lex.fulfillWithError(intentRequest, callback, error.response.data.error);
  }
};

/**
 * Handle the intent request of someone asking for the number of employees
 * in the company.
 * @param {Object} intentRequest Intent request information
 * @param {function} callback Callback function to handle the response
 */
const countGorillas = async function(intentRequest, callback) {
  try {
    const getEmployeesResult = await bambooAPIMethods.getEmployees();
    const employeesCount = getEmployeesResult.data.employees.length + 1;
    try {
      const res = await numbersAPIMethods.getTriviaForEmployeeCount(
        employeesCount
      );
      console.log(res.data);
      const message = `We are ${employeesCount} souls which is close to ${res.data}.`;
      lex.fulfillWithSuccess(intentRequest, callback, message);
    } catch (error) {
      console.log(error.data);
      const message = `We are ${employeesCount} souls.`;
      lex.fulfillWithSuccess(intentRequest, callback, message);
    }
  } catch (error) {
    console.log(error);
    lex.fulfillWithError(intentRequest, callback, error);
  }
};

/**
 * Response with the URL of an image of the requested restaurant's menu
 * @param {Object} intentRequest Intent request information
 * @param {function} callback Callback function to handle the response
 */
const getRestaurantMenu = function(intentRequest, callback) {
  const { restaurant } = intentRequest.currentIntent.slots;

  // eslint-disable-next-line no-prototype-builtins
  if (!restaurant || !foodBonus.menus.hasOwnProperty(restaurant)) {
    const errorMessage = `Sorry, I'm not aware of the menu for ${restaurant}`;
    lex.fulfillWithSuccess(intentRequest, callback, errorMessage);
  }

  const response = foodBonus.menus[restaurant];
  lex.fulfillWithSuccess(intentRequest, callback, response);
};

const getInformationAboutWellnessActivities = async function(
  intentRequest,
  callback
) {
  const activity = intentRequest.currentIntent.slots.wellness;
  if (!activity || wellness.wellnessActivities.indexOf(activity) === -1) {
    const errorMessage = `Sorry I didn't get the intended activity name`;
    lex.fulfillWithSuccess(intentRequest, callback, errorMessage);
    return;
  }
  const calendar = google.calendar('v3');
  const timeMin = moment(new Date());
  try {
    const response = await calendar.events.list({
      auth: googleCalendar.serviceAccountAuth,
      calendarId: googleCalendar.calendarId,
      timeMin: timeMin.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });
    const events = response.data.items;
    const [event] = events.filter(e => e.summary === activity);
    if (!event) {
      const noEventsFoundMessage = `No events found`;
      lex.fulfillWithSuccess(intentRequest, callback, noEventsFoundMessage);
      return;
    }
    const readableActivity = `Next ${activity} activity will be ${dateFormatters.humanDate(
      moment,
      event.start.dateTime
    )}`;
    const additionalText = event.description
      ? `${event.description}. To stay up to date with the coming activities visit the company's portal.`
      : `To stay up to date with the coming activities visit the company's portal.`;
    const eventsUrl = 'https://band.gorillalogic.com/events/';
    const message = `${readableActivity}\n${additionalText}\nSee events:\n${eventsUrl}`;
    lex.fulfillWithSuccess(intentRequest, callback, message);
  } catch (error) {
    console.log(error);
    lex.fulfillWithError(intentRequest, callback, error);
  }
};

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
    return getTimeOffBalance(intentRequest, callback);
  } else if (intentName === 'FunChuckNorrisJokes') {
    return tellAJokeAboutChuckNorris(intentRequest, callback);
  } else if (intentName === 'CreatePTORequest') {
    return createTimeOffRequest(intentRequest, callback);
  } else if (intentName === 'UpdateLicensePlateNumber') {
    return updateLicensePlate(intentRequest, callback);
  } else if (intentName === 'InfoEmployeesCount') {
    return countGorillas(intentRequest, callback);
  } else if (intentName === 'LunchPerkMenu') {
    return getRestaurantMenu(intentRequest, callback);
  } else if (intentName === 'InfoWellnessActivity') {
    return getInformationAboutWellnessActivities(intentRequest, callback);
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
