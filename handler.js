"use strict";

/**
 * Winston module.
 * This code represents a Lambda function to handle backend logic for Winston.
 * Winston is a virtual HR assistant created using Amazon Lex.
 * To know more about Amazon Lex check out {@link https://docs.aws.amazon.com/lex/latest/dg/what-is.html}
 * @summary Backend logic for Winston (Amazon Lex bot).
 * @module winstonbot
 * @author Gorilla Logic
 * @version 1.3.2
 */

const axios = require("axios");
const { WebClient } = require("@slack/client"); // https://github.com/slackapi/node-slack-sdk
const moment = require("moment");
moment().format();
require("moment-weekday-calc");

// ================================ Lex Bot Helpers ===================================================================

/**
 * These functions help you build responses that matches the output format expected by
 * Amazon Lex bots. Each structure is intended to be use on specific cases depending
 * on the conversation flow.
 * To know more about these output formats refer to Lex documentation:
 * {@link https://docs.aws.amazon.com/lex/latest/dg/lambda-input-response-format.html}.
 */

function elicitSlot(
  sessionAttributes,
  intentName,
  slots,
  slotToElicit,
  message
) {
  return {
    sessionAttributes,
    dialogAction: {
      type: "ElicitSlot",
      intentName,
      slots,
      slotToElicit,
      message
    }
  };
}

function close(sessionAttributes, fulfillmentState, message) {
  return {
    sessionAttributes,
    dialogAction: {
      type: "Close",
      fulfillmentState,
      message
    }
  };
}

function delegate(sessionAttributes, slots) {
  return {
    sessionAttributes,
    dialogAction: {
      type: "Delegate",
      slots
    }
  };
}

function buildValidationResult(isValid, violatedSlot, messageContent) {
  if (messageContent == null) {
    return {
      isValid,
      violatedSlot
    };
  }
  return {
    isValid,
    violatedSlot,
    message: { contentType: "PlainText", content: messageContent }
  };
}

/**
 * Returns the given success message to the bot caller
 * @param {Object} intentRequest Intent request information
 * @param {function} callback Callback function to handle the response
 * @param {string} message The success message to return to the bot caller
 */
const fulfillWithSuccess = (intentRequest, callback, message) => {
  fulfillWithMessage(intentRequest, callback, message);
};

/**
 * Returns the given error message to the bot caller.
 * It returns a message with this pattern:
 *  - Sorry something failed. I got this error: [the error here].
 * @param {Object} intentRequest Intent request information
 * @param {function} callback Callback function to handle the response
 * @param {string} message The actual error to return to the bot caller
 */
const fulfillWithError = (intentRequest, callback, message) => {
  let error = `Sorry something failed. I got this error: ${message}.`;
  fulfillWithMessage(intentRequest, callback, error);
};

const fulfillWithMessage = (intentRequest, callback, message) => {
  // Fulfill the intent with a error response
  callback(
    close(intentRequest.sessionAttributes, "Fulfilled", {
      contentType: "PlainText",
      content: message
    })
  );
};

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
  PTO: 1,
  "Unpaid time off": 6,
  "Bereavement Leave": 3,
  "Paid Marriage Leave": 8,
  "Travel Requests": 7
};

/**
 * Collection of menu images for different nearby restaurants that participate
 * on the Gorilla Logic lunch perk for Costa Rican gorillas.
 */
const menus = {
  nana: `The menu will be open (i.e. there will not be a specific menu for the Gorilla Logic Lunch Perk).
Take a look at the menu here:
https://res.cloudinary.com/greivinlopez/image/upload/v1565023471/menus/nana.jpg`,
  mauros: `A specific menu will be offered at these restaurants for the Gorilla Logic Lunch Perk, which consultants are to request.
Take a look at the menu here:
https://res.cloudinary.com/greivinlopez/image/upload/v1565023470/menus/mauros.png`,
  matsuri: `A specific menu will be offered at these restaurants for the Gorilla Logic Lunch Perk, which consultants are to request.
Take a look at the menu here:
https://res.cloudinary.com/greivinlopez/image/upload/v1565023471/menus/matsuri.png`,
  dorado: `The dish of the day will be offered for the Gorilla Logic Lunch Perk.
Take a look at the menu here:
https://res.cloudinary.com/greivinlopez/image/upload/v1565023469/menus/dorado.png`,
  chefilisimo: `This service may be used by following this link:
https://docs.google.com/forms/d/1wD9W0fa1qa_p3AtXAqvf8l1STQ1HLjQ-4n1YIbaDrKo/edit?usp=sharing
Orders are to be made the day before, and they will be delivered directly to the office.
Meal orders will be delivered to the office at 11:30 a.m. on the 10th floor. Consultants will be
responsible for picking up their orders.`,
  cosi: `The “Taste two” menu will be offered for the Gorilla Logic Lunch Perk.`,
  cherry: `The menu will be open (i.e. there will not be a specific menu for the Gorilla Logic Lunch Perk).`
};

const wellnessActivities = ["Yoga", "ZenFit", "MMA"];

/**
 * Gets a human readable representation of the given date.
 * Using UTC -6 offset (Costa Rica timezone)
 * @param {Date} date A js Date instance
 * @return {string}
 */
const humanDate = function(date) {
  const COSTA_RICA_UTC_OFFSET = -6;
  const m = moment(date).utcOffset(COSTA_RICA_UTC_OFFSET);
  return m.calendar();
};

/**
 * Finds a person on the given employees object by matching the workEmail field..
 * @param {Object[]} employees Complete list of company employees.
 * @param {string} name The complete name of the employee to search for.
 * @return {Object} The object with the founded person's info. It returns undefined if not found.
 */
const findPersonByEmail = function(employees, email) {
  let findings = employees.filter(function(employee) {
    return employee.workEmail === email;
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
    "Chuck Norris doesn't flush the toilet...he scares the shit out of it.",
    "Chuck Norris has a grizzly bear carpet in his room. The bear isn't dead it is just afraid to move.",
    "Chuck Norris died 20 years ago, Death just hasn't built up the courage to tell him yet.",
    "While learning CPR Chuck Norris actually brought the practice dummy to life.",
    "Chuck Norris has already been to Mars; that's why there are no signs of life.",
    "Chuck Norris and Superman once fought each other on a bet. The loser had to start wearing his underwear on the outside of his pants.",
    "Chuck norris went skydiving and his parachute failed to open, so he took it back the next day for a refund.",
    "Chuck Norris doesn't dial the wrong number, you pick up the wrong phone.",
    "Did you know Chuck Norris had a role in Star Wars?. He was the force.",
    "Chuck Norris will never have a heart attack. His heart isn't nearly foolish enough to attack him.",
    "Before going to bed, the Boogeyman always checks his closet for Chuck Norris.",
    "Chuck Norris counted to infinity - twice.",
    "Chuck Norris uses a stunt double during crying scenes.",
    'Voldemort refers to Chuck Norris as "You Know Who."',
    "When Chuck Norris does a push up, he isn't lifting himself up, he's pushing the Earth down.",
    "Death once had a near Chuck Norris experience.",
    "Chuck Norris frequently donates blood to the Red Cross. Just never his own.",
    "Chuck Norris can light a fire by rubbing two ice-cubes together.",
    "Chuck Norris once went to court for a crime, the judge pleaded guilty.",
    "Chuck Norris ordered a Big Mac at Burger King, and got one.",
    "Chuck Norris can pick oranges from an apple tree and make the best lemonade youve ever tasted.",
    "Chuck Norris protects his body guards.",
    "Chuck Norris makes onions cry.",
    "Chuck Norris won the Boston marathon in New York.",
    "Chuck Norris knows Victoria's secret.",
    "A cop once pulled Chuck Norris over...Luckily, the cop left only with a warning.",
    "Chuck Norris can lift up a chair with one hand... While he's sitting on it...",
    "Once a cobra bit Chuck Norris. After 5 days of extreme pain... the snake finally died.",
    "There used to be a street named after Chuck Norris, but it was changed because nobody crosses Chuck Norris and lives.",
    "Chuck Norris can strangle you with a cordless phone.",
    "When the President pushes the big red button, Chuck Norris's cell phone rings.",
    "Aliens believe in Chuck Norris.",
    "Chuck Norris can win an argument with his wife.",
    "While vacationing in France, Chuck Norris went out for a casual bike ride and accidentally won the Tour de France.",
    "Chuck Norris can whistle in five different languages, including sign language and braille."
  ];
  return jokes[Math.floor(Math.random() * jokes.length)];
};

// ================================ BambooHR API ============================================================================
const subDomain = "gorillalogic";

/**
 * Base configuration for BambooHR API requests
 */
const bambooAPI = axios.create({
  baseURL: "https://api.bamboohr.com/api/gateway.php/" + subDomain,
  auth: {
    username: process.env.bambooApiKey,
    password: "x"
  },
  timeout: 6000,
  headers: {
    accept: "application/json",
    "accept-encoding": "gzip, deflate",
    "accept-language": "en-US,en;q=0.8"
  }
});

/**
 * Gets the complete list of employees from the BambooHR system.
 * @param {function} doSomething Callback function expected to do something with the list of employees
 */
const getEmployees = () => {
  return bambooAPI.get("/v1/employees/directory");
};

/**
 * Gets the time off balance from BambooHR system.
 * @param {string} id The Slack user id
 * @param {string} y The year in the form 'yyyy'
 * @param {string} m The month in the form 'mm'
 * @param {string} d The day in the form 'dd'
 */
const calculateTimeOffBalance = (id, y, m, d) => {
  return bambooAPI.get(
    "/v1/employees/" + id + "/time_off/calculator/?end=" + y + "-" + m + "-" + d
  );
};

/**
 * Get a list of who's out, including company holidays.
 * We use this API request to get the official company holidays as it's the only way
 * @param {string} start Start date for the query request
 * @param {string} end End date for the query request
 * @param {function} doSomething Callback function expected to do something with the result
 */
const whosOut = function(start, end, doSomething) {
  bambooAPI
    .get(`/v1/time_off/whos_out?start=${start}&end=${end}`)
    .then(function(response) {
      doSomething(response.data);
    })
    .catch(function(error) {
      console.log(error);
    });
};

// ================================ Slack API ============================================================================
// An access token (from your Slack app or custom integration - xoxp, xoxb, or xoxa)
const slackApiToken = process.env.slackApiToken;

/**
 * Extracts the user ID needed for calls to the Slack API as sent by the client
 * @param {Object} intentRequest Intent requet information
 * @returns {string} The user ID for the Slack API coming on the client request
 */
const getSlackUserId = intentRequest => {
  /**
   * @todo: Check if the request actually came from Slack.
   * Under requestAttributes (from event) you can check the presence of
   * x-amz-lex:channel-type.
   * The value will be Slack if the user comes from slack.
   */
  let userId = intentRequest.userId;
  userId = userId.slice(userId.lastIndexOf(":") + 1);
  return userId;
};

/**
 * Gets a promise to request the user information from Slack API
 * associated to the given user ID.
 * @param {string} userId Slack user ID
 */
const getSlackUserInfo = userId => {
  const web = new WebClient(slackApiToken);
  return web.users.info({ user: userId });
};

/**
 * Retrieve the profile information from Slack for the given ID
 * @param {string} userId Slack user ID
 */
const getSlackUserProfile = userId => {
  const web = new WebClient(slackApiToken);
  return web.users.profile.get({ user: userId });
};

// ================================ ParkingBot API ============================================================================
// Parking bot configuration
const parkingAPI = axios.create({
  baseURL: "https://9pfd6h0h3e.execute-api.us-east-1.amazonaws.com/dev/",
  timeout: 10000,
  headers: {
    accept: "application/json",
    "accept-encoding": "gzip, deflate",
    "accept-language": "en-US,en;q=0.8",
    "content-type": "application/json"
  }
});

// ================================ Numbers API ===============================
const numbersAPI = axios.create({
  baseURL: "http://numbersapi.com/",
  timeout: 6000,
  headers: {
    accept: "text/plain",
    "accept-encoding": "gzip, deflate",
    "accept-language": "en-US,en;q=0.8"
  }
});

// ================================ Google Calendar ===============================
const { google } = require("googleapis");

const calendarId = "6i7h19gftsao0fl18nibeukts8@group.calendar.google.com";
const serviceAccount = {
  type: "service_account",
  project_id: "winston-2d06e",
  private_key_id: "c34bced7e2e96c08b067de38f1fd418eee4c5aa6",
  private_key:
    "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDLoqVrN4RRB6y/\nd5mrovpsI7Kcx4SKN6gwZ0ohcBTim+p7f5Qz3e09/UcMY0fecNZy9zGzpadj3FkW\nYkZRufEdDZ8JbxaT1TYepioQMQecXC1B53hXURfzhbBlR9iaYmz6A2Cnu7jC24zF\ncNOKBFqhUgECxokJASwZ32S+V2eB32B+Mz6Mk6gx0/9ASOKtmlV6myPQlIOn1oug\nx9Y+m15QDL0wf0CwgR957vRkZOGibdAqVzCHoKOsKO1i5A8ktehrK6Htp4yT/sCT\nlk4Ocw+mP2TJ5d2mf3C8sXfRZ0lOP9HGvhTuY4ohjB7J4uIiDo2CDN71RhoGVv6I\n/Ii1iIYLAgMBAAECggEAF5u9rdZ74qEPKAuHp1x3x/3DgWWoOhYFy8bN016ZLUSC\nRNsfpXu/O4aXrBn+hQ1z71Q1UOyNoYg0U+IE4Qi7qXCg1Ykphu4bHiaJjeMBTOFq\n5c8eJpFiQ3tmXfecZxmuJLYriIa8/upRQbq467FhiH5nW5kE3iRipoU9usuLVoUI\nDMsEtZLey5xHteYdgRMu3dmSSofvFs6cPWYlcxkl6sY6FGY4aLlxGuURXVHwz7OV\nnVN1DY7TmqnzyaPPiBY9X9Of24Ieoalx8He5hCE3MyVp+pNbD8W7IrVAUQ8OI8WT\nB4O2FnEGtqDbLLElr/MJc+ZSVHPQlqZ5Ec0csWPPUQKBgQD7bmoWa585BC77oY1o\nu+Bt5no23yEezPLt3WGCradFMhXeGuaxX7KyaAQoyrLc5ysvsskv/tScvcmC9bIQ\nsARD5kIRISsExJaoRrOzgrkFLNQuPrwTY0w6EDDkSUy7Cr6zLl4avhrIj/6luLf0\n/WHZcK85nU80Gz5eN+GCbpzsNQKBgQDPVeYVCdsEbCSIGF7F6mziWucrvl1N2fSy\nc1T6xtegf5oeioA0yMI8IuSFCLQroBceUEzCcADAU98HpvVxFUhnVJAWYymkDWY4\nt0yaR/qek63Ar4G9wg+85GtzLQTRJnh3k10GlR+t1ggOErTrn7KEzG/3mJU4c2Hz\nqgyWVOtxPwKBgFK+w6sdQAlDlzK4uBD/w5xnfVERnZTFXi1p7e1TuPjMwuWVdNZq\n6CROlw/VpYeNjGjmLc/dzZrH2sl+kltrkfvGi3eXstCe4fX/TqSFIN7TIgEWJE89\nHpj9OxnmBZqIrrnJSK8EYUwgF23ynJfDy7ADpacQXkCHtr7LJSwHux0BAoGANVoF\nOqSulxS80chzmroYCqcZlUgG+mF7de/3jhBcrBApuHIrS2ndkVvpMdJrik5HpKVF\nG0N27gam/XEY92BioTRBX4Fk1bIc+7svGwQqmWOm8k43NH0bT5/3hkuvUaJ0nVBu\nP6Nf43uP1w85Puh5J3Lz3OKGg2AtdGXtl0GC1EECgYAPdtuhlLhCS9JW9f/IrvGo\n24s2nNxHzXywyTC5rfGApFxHngTNrVzYsLEFgMEvF5I8sQTd9pa7FBAdIS+rTvLU\nOZT4S+67n7Q8fHbMayiM3qVmNEw86iq8d4gj8npGAn1pYP9u4lsK0byoaxe5kki7\nCsc4Eg52IgiBEiJY7TTtFg==\n-----END PRIVATE KEY-----\n",
  client_email: "wellness-activities@winston-2d06e.iam.gserviceaccount.com",
  client_id: "103934030182041620924",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/wellness-activities%40winston-2d06e.iam.gserviceaccount.com"
};

const serviceAccountAuth = new google.auth.JWT({
  email: serviceAccount.client_email,
  key: serviceAccount.private_key,
  scopes: "https://www.googleapis.com/auth/calendar"
});

const getUpcomingWellnessEvent = function(activity, events) {
  const upcoming = events.filter(event => {
    return event.summary === activity;
  });
  if (upcoming.length > 0) {
    return upcoming[0];
  }
  return null;
};

// ================================ Functions to handle intents =============================================================

/**
 * Gets the timeoff balance of a given employee
 * @param {Object} intentRequest Intent request information
 * @param {function} callback Callback function to handle the response
 */
const getTimeOffBalance = async function(intentRequest, callback) {
  const userId = getSlackUserId(intentRequest);
  // Request Slack API to extract the email from the user Id
  let userProfile = null;
  let person = null;
  try {
    userProfile = await getSlackUserProfile(userId);
    const getEmployeesResult = await getEmployees();

    let slackEmail = userProfile.profile.email;
    let employees = getEmployeesResult.data.employees;
    person = findPersonByEmail(employees, slackEmail);

    if (person === undefined) {
      let err = `Sorry, ${slackEmail} could not be found`;
      throw err;
    }
  } catch (error) {
    console.log(error);
    fulfillWithError(intentRequest, callback, error);
    return;
  }

  let today = new Date();
  let dd = today.getDate();
  let mm = today.getMonth() + 1; //January is 0!
  let yyyy = today.getFullYear();

  calculateTimeOffBalance(person.id, yyyy, mm, dd)
    .then(response => {
      let ptos = filterPTOs(response.data, "PTO"); //Filter time off by PTO
      let employeeName = person.displayName;
      if (ptos === undefined) {
        console.log(
          `Sorry, could not found PTO information for ${employeeName}`
        );
        return;
      }

      // Success - answer to the user with the PTO days
      const message = `${employeeName} you have ${ptos.balance} ${
        ptos.units
      } left`;
      console.log(message);
      fulfillWithSuccess(intentRequest, callback, message);
    })
    .catch(error => {
      console.log(error);
      fulfillWithError(intentRequest, callback, error);
    });
};

/**
 * Response with a pseudo-randomly selected joke about Chuck Norris.
 * @param {Object} intentRequest Intent request information
 * @param {function} callback Callback function to handle the response
 */
const tellAJokeAboutChuckNorris = function(intentRequest, callback) {
  const joke = chuckNorrisJoke();
  fulfillWithSuccess(intentRequest, callback, joke);
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
  if (
    typeOfTimeOff &&
    Object.keys(timeOffTypes).indexOf(typeOfTimeOff) === -1
  ) {
    return buildValidationResult(
      false,
      "typeOfTimeOff",
      `Sorry I can't create a time off request for ${typeOfTimeOff}, would you like a different type of time off?`
    );
  }
  if (startDate) {
    if (new Date(startDate) < new Date()) {
      return buildValidationResult(
        false,
        "startDate",
        `I can't schedule a time off request in the past! Can you provide a different date?`
      );
    }
  }
  if (endDate) {
    if (new Date(endDate) < new Date(startDate)) {
      return buildValidationResult(
        false,
        "endDate",
        "Your return date must be after your leave date! Can you try a different date?"
      );
    }
  }
  return buildValidationResult(true, null, null);
};

/**
 * Handle the intent of a user trying to create a new time off request.
 * @todo Refactor this code for a more readable version. Take a look at updateLicensePlate
 * @param {Object} intentRequest Intent requet information
 * @param {function} callback Callback function to handle the response
 */
const createTimeOffRequest = async function(intentRequest, callback) {
  const typeOfTimeOff = intentRequest.currentIntent.slots.typeOfTimeOff;
  const startDate = intentRequest.currentIntent.slots.startDate;
  const endDate = intentRequest.currentIntent.slots.endDate;
  // Session attributes from the intent.
  var outputSessionAttributes = intentRequest.sessionAttributes;

  if (intentRequest.invocationSource === "DialogCodeHook") {
    // Perform basic validation on the supplied input slots.
    // Use the elicitSlot dialog action to re-prompt for the first violation detected.
    const slots = intentRequest.currentIntent.slots;
    const validationResult = validateTimeOffRequest(
      typeOfTimeOff,
      startDate,
      endDate
    );
    if (!validationResult.isValid) {
      slots[`${validationResult.violatedSlot}`] = null;
      callback(
        elicitSlot(
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
        outputSessionAttributes = { confirmationPrompt: "" };
      }
      let displayStart = moment(startDate).format("dddd, MMMM Do YYYY");
      let displayEnd = moment(endDate).format("dddd, MMMM Do YYYY");

      let confirmationPrompt = `Can you confirm your ${typeOfTimeOff} request from ${displayStart} to ${displayEnd}?`;
      if (startDate === endDate) {
        confirmationPrompt = `Can you confirm your ${typeOfTimeOff} request for ${displayStart}?`;
      }

      outputSessionAttributes.confirmationPrompt = confirmationPrompt;
    }
    callback(
      delegate(outputSessionAttributes, intentRequest.currentIntent.slots)
    );
    return;
  }

  const userId = getSlackUserId(intentRequest);
  // Request Slack API to extract the email from the user Id
  let userProfile = null;
  let person = null;
  try {
    userProfile = await getSlackUserProfile(userId);
    const getEmployeesResult = await getEmployees();

    let slackEmail = userProfile.profile.email;
    let employees = getEmployeesResult.data.employees;
    person = findPersonByEmail(employees, slackEmail);

    if (person === undefined) {
      let err = `Sorry, ${slackEmail} could not be found`;
      throw err;
    }
  } catch (error) {
    console.log(error);
    fulfillWithError(intentRequest, callback, error);
    return;
  }

  // Calculate the amount of working days to request
  if (startDate && endDate) {
    whosOut(startDate, endDate, function(response) {
      // Filter non-holidays elements from this
      // response and put the dates for company
      // holidays into an array.
      let items = response.filter(function(item) {
        return item.type === "holiday";
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
        weekdays: [1, 2, 3, 4, 5],
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
      bambooAPI
        .put("/v1/employees/" + person.id + "/time_off/request/", xmlData, {
          headers: { "Content-Type": "text/xml" }
        })
        .then(response => {
          let approver = response.data.approvers[0].displayName;
          let content = `OK ${
            person.firstName
          }, I have sent your request. Please wait for approval.`;
          if (approver !== "") {
            content = `OK ${
              person.firstName
            }, I have sent your request. Please wait for approval from ${approver}.`;
          }
          // Fulfill the request
          fulfillWithSuccess(intentRequest, callback, content);
        })
        .catch(error => {
          console.log(error);
          fulfillWithError(intentRequest, callback, error);
        });
    });
  }
};

/**
 * Updates an existing license plate number for the parking bot.
 * It first request the user information from Slack API to retrieve
 * the username which is one of the requirements to update the
 * plate using the parking bot API.
 * @param {Object} intentRequest Intent requet information
 * @param {function} callback Callback function to handle the response
 */
const updateLicensePlate = async function(intentRequest, callback) {
  let previousPlate = intentRequest.currentIntent.slots.previousPlate;
  let newPlate = intentRequest.currentIntent.slots.newPlate;

  if (!previousPlate || !newPlate) {
    let errorMessage = `Something failed with arguments previousPlate: ${previousPlate} or newPlate: ${newPlate}`;
    console.log(errorMessage);
    fulfillWithError(intentRequest, callback, errorMessage);
  }

  const userId = getSlackUserId(intentRequest);
  let userInfo = null;
  try {
    // Retrieve user information from Slack using the SDK
    userInfo = await getSlackUserInfo(userId);
  } catch (error) {
    console.log(error);
    fulfillWithError(
      intentRequest,
      callback,
      "Failed to retrieve user's info from Slack"
    );
    return;
  }

  const content = {
    previousPlate: previousPlate.toUpperCase(),
    newPlate: newPlate.toUpperCase(),
    username: userInfo.user.name,
    MAGIC_KEY: process.env.parkingAPIMagicKey
  };

  // Update the plate number using ParkingBot API
  parkingAPI
    .post("/update-existing-plate", content)
    .then(res => {
      console.log(res.data);
      const message = `Your plate number was updated to ${res.data.newPlate}.`;
      fulfillWithSuccess(intentRequest, callback, message);
    })
    .catch(error => {
      console.log(error);
      fulfillWithError(intentRequest, callback, error.response.data.error);
    });
};

/**
 * Handle the intent request of someone asking for the number of employees
 * in the company.
 * @param {Object} intentRequest Intent requet information
 * @param {function} callback Callback function to handle the response
 */
const countGorillas = async function(intentRequest, callback) {
  try {
    const getEmployeesResult = await getEmployees();
    const employeesCount = getEmployeesResult.data.employees.length + 1;

    numbersAPI
      .get(`/${employeesCount}/trivia?notfound=floor&fragment`)
      .then(res => {
        console.log(res.data);
        const message = `We are ${employeesCount} souls which is close to ${
          res.data
        }.`;
        fulfillWithSuccess(intentRequest, callback, message);
      })
      .catch(error => {
        console.log(error.data);
        const message = `We are ${employeesCount} souls.`;
        fulfillWithSuccess(intentRequest, callback, message);
      });
  } catch (error) {
    console.log(error);
    fulfillWithError(intentRequest, callback, error);
  }
};

/**
 * Response with the URL of an image of the requested restaurant's menu
 * @param {Object} intentRequest Intent request information
 * @param {function} callback Callback function to handle the response
 */
const getRestaurantMenu = function(intentRequest, callback) {
  const restaurant = intentRequest.currentIntent.slots.restaurant;

  if (!restaurant || !menus.hasOwnProperty(restaurant)) {
    const errorMessage = `Sorry, I'm not aware of the menu for ${restaurant}`;
    fulfillWithSuccess(intentRequest, callback, errorMessage);
  }

  const response = menus[restaurant];
  fulfillWithSuccess(intentRequest, callback, response);
};

const getInformationAboutWellnessActivities = function(intentRequest, callback) {
  const { activity } = intentRequest.currentIntent.slots;
  if (!activity || wellnessActivities.indexOf(activity) === -1) {
    const errorMessage = `Sorry I didn't get the intended activity name`;
    fulfillWithSuccess(intentRequest, callback, errorMessage);
    return;
  }
  const calendar = google.calendar("v3");
  const timeMin = moment(new Date());
  calendar.events.list({
    auth: serviceAccountAuth,
    calendarId,
    timeMin: timeMin.toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: "startTime"
  }).then(response => {
    const events = response.data.items;
    const event = getUpcomingWellnessEvent(activity, events);
    if (!event) {
      const noEventsFoundMessage = `No events found`;
      fulfillWithSuccess(intentRequest, callback, noEventsFoundMessage);
      return;
    }
    let readableActivity = `Next ${activity} activity will be ${humanDate(event.start.dateTime)}`;
    const additionalText = 
      event.description 
      ? `${event.description}. To stay up to date with the coming activities visit the company's portal.` 
      : `To stay up to date with the coming activities visit the company's portal.`;
    const eventsUrl = "https://band.gorillalogic.com/events/";
    const message = `${readableActivity}\n${additionalText}\nSee events:\n${eventsUrl}`;
    fulfillWithSuccess(intentRequest, callback, message);
  }).error(error => {
    console.log(error);
    fulfillWithError(intentRequest, callback, error);
  });
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
  if (intentName === "TimeOffPTOBalance") {
    return getTimeOffBalance(intentRequest, callback);
  } else if (intentName === "FunChuckNorrisJokes") {
    return tellAJokeAboutChuckNorris(intentRequest, callback);
  } else if (intentName === "CreatePTORequest") {
    return createTimeOffRequest(intentRequest, callback);
  } else if (intentName === "UpdateLicensePlateNumber") {
    return updateLicensePlate(intentRequest, callback);
  } else if (intentName === "InfoEmployeesCount") {
    return countGorillas(intentRequest, callback);
  } else if (intentName === "LunchPerkMenu") {
    return getRestaurantMenu(intentRequest, callback);
  } else if (intentName === "InfoWellnessActivity") {
    return getInformationAboutWellnessActivities(intentRequest, callback);
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
    if (event.bot.name !== "Winston") {
      callback("Invalid Bot Name");
    }

    dispatch(event, response => callback(null, response));
  } catch (err) {
    callback(err);
  }
};
