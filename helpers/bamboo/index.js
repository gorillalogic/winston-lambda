/**
 * Collection of time-off request types from BambooHR.
 * The ids are specific to Gorilla Logic customized settings.
 * You can see the different options by looking at the UI and
 * using this API call:
 * GET {@link https://api.bamboohr.com/api/gateway.php/gorillalogic/v1/meta/time_off/types/}
 * With the proper API key.
 */
const timeOffTypes = {
  PTO: 1,
  'Unpaid time off': 6,
  'Bereavement Leave': 3,
  'Paid Marriage Leave': 8,
  'Travel Requests': 7,
};

module.exports = { timeOffTypes };
