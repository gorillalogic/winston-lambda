const { slackAPIMethods } = require('../../api/slack');
const { bambooAPIMethods } = require('../../api/bamboo');
const slack = require('../../helpers/slack');
const lex = require('../../helpers/lex');

/**
 * Gets the timeoff balance of a given employee
 * @param {Object} intentRequest Intent request information
 * @param {function} callback Callback function to handle the response
 */
const getTimeOffBalance = async (intentRequest, callback) => {
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

module.exports = getTimeOffBalance;
