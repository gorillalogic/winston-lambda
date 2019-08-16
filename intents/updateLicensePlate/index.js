const lex = require('../../helpers/lex');
const slack = require('../../helpers/slack');
const { parkingAPIMethods } = require('../../api/parking');

/**
 * Updates an existing license plate number for the parking bot.
 * It first request the user information from Slack API to retrieve
 * the username which is one of the requirements to update the
 * plate using the parking bot API.
 * @param {Object} intentRequest Intent request information
 * @param {function} callback Callback function to handle the response
 */
const updateLicensePlate = async (intentRequest, callback) => {
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

module.exports = updateLicensePlate;
