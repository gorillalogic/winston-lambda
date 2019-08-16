const lex = require('../../helpers/lex');
const random = require('../../helpers/random');

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

module.exports = tellAJokeAboutChuckNorris;
