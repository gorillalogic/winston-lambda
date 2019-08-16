const lex = require('../../helpers/lex');
const validateTimeOffRequest = require('../validateTimeOffRequest');
const moment = require('moment');
const slack = require('../../helpers/slack');
const { bambooAPIMethods } = require('../../api/bamboo');
const { slackAPIMethods } = require('../../api/slack');

/**
 * Handle the intent of a user trying to create a new time off request.
 * @todo Refactor this code for a more readable version. Take a look at updateLicensePlate
 * @param {Object} intentRequest Intent request information
 * @param {function} callback Callback function to handle the response
 */
const createTimeOffRequest = async (intentRequest, callback) => {
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

module.exports = createTimeOffRequest;
