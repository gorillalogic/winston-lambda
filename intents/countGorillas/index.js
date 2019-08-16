const { bambooAPIMethods } = require('../../api/bamboo');
const { numbersAPIMethods } = require('../../api/numbers');
const lex = require('../../helpers/lex');

/**
 * Handle the intent request of someone asking for the number of employees
 * in the company.
 * @param {Object} intentRequest Intent request information
 * @param {function} callback Callback function to handle the response
 */
const countGorillas = async (intentRequest, callback) => {
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

module.exports = countGorillas;
