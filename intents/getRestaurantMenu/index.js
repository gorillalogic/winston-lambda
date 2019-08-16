const foodBonus = require('../../helpers/foodBonus');
const lex = require('../../helpers/lex');

/**
 * Response with the URL of an image of the requested restaurant's menu
 * @param {Object} intentRequest Intent request information
 * @param {function} callback Callback function to handle the response
 */
const getRestaurantMenu = (intentRequest, callback) => {
  const { restaurant } = intentRequest.currentIntent.slots;

  // eslint-disable-next-line no-prototype-builtins
  if (!restaurant || !foodBonus.menus.hasOwnProperty(restaurant)) {
    const errorMessage = `Sorry, I'm not aware of the menu for ${restaurant}`;
    lex.fulfillWithSuccess(intentRequest, callback, errorMessage);
  }

  const response = foodBonus.menus[restaurant];
  lex.fulfillWithSuccess(intentRequest, callback, response);
};

module.exports = getRestaurantMenu;