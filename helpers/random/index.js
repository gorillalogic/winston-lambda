/**
 * Randomly select an element from the given array
 * @param {array} array An array of elements where to choose one.
 * @return {any}
 */
const shuffleAndPickOne = array => {
  return array[Math.floor(Math.random() * array.length)];
};

module.exports = { shuffleAndPickOne };
