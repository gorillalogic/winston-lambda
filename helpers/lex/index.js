/**
 * These functions help you build responses that matches the output format expected by
 * Amazon Lex bots. Each structure is intended to be use on specific cases depending
 * on the conversation flow.
 * To know more about these output formats refer to Lex documentation:
 * {@link https://docs.aws.amazon.com/lex/latest/dg/lambda-input-response-format.html}.
 */

// eslint-disable-next-line max-params
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
  const error = `Sorry something failed. I got this error: ${message}.`;
  fulfillWithMessage(intentRequest, callback, error);
};

const fulfillWithMessage = (intentRequest, callback, message) => {
  // Fulfill the intent with a error response
  callback(
    close(intentRequest.sessionAttributes, 'Fulfilled', {
      contentType: 'PlainText',
      content: message,
    })
  );
};

module.exports = {
  elicitSlot,
  close,
  delegate,
  buildValidationResult,
  fulfillWithSuccess,
  fulfillWithError,
};
