const bamboo = require('../../helpers/bamboo');
const lex = require('../../helpers/lex');

/**
 * Validates the provided input slots from the user and returns a validation object
 * with a boolean value describing if validation passed and the violated slot and
 * the error message to be sent back to the user.
 * @param {String} typeOfTimeOff Type of timeoff requested. Uses a custom slot type from the Lex bot.
 * @param {String} startDate The start date in the form YYYY-MM-DD.
 * @param {String} endDate The end date in the form YYYY-MM-DD.
 */
const validateTimeOffRequest = (typeOfTimeOff, startDate, endDate) => {
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

module.exports = validateTimeOffRequest;
