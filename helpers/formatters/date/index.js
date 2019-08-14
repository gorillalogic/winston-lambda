/**
 * Gets a human readable representation of the given date.
 * Using UTC -6 offset (Costa Rica timezone)
 * @param {moment.Moment} moment Moment.js instance
 * @param {Date} date A js Date instance
 * @return {string}
 */
const humanDate = function(moment, date) {
  const COSTA_RICA_UTC_OFFSET = -6;
  const m = moment(date).utcOffset(COSTA_RICA_UTC_OFFSET);
  return m.calendar();
};

module.exports = {
  humanDate,
};
