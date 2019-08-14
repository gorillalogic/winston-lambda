const axios = require('axios');
const subDomain = 'gorillalogic'; // TODO: Move to env variable

/**
 * @type {axios.AxiosInstance}
 */
const bambooAPI = axios.create({
  baseURL: `https://api.bamboohr.com/api/gateway.php/${subDomain}`,
  auth: {
    username: process.env.bambooApiKey,
    password: 'x',
  },
  timeout: 6000,
  headers: {
    accept: 'application/json',
    'accept-encoding': 'gzip, deflate',
    'accept-language': 'en-US,en;q=0.8',
  },
});

const bambooAPIMethods = {
  /**
   * Gets the complete list of employees from the BambooHR system.
   */
  getEmployees() {
    return bambooAPI.get('/v1/employees/directory');
  },
  /**
   * Gets the time off balance from BambooHR system.
   * @param {string} id The Slack user id
   * @param {string} y The year in the form 'yyyy'
   * @param {string} m The month in the form 'mm'
   * @param {string} d The day in the form 'dd'
   */
  calculateTimeOffBalance(id, y, m, d) {
    return bambooAPI.get(
      `/v1/employees/${id}/time_off/calculator/?end=${y}-${m}-${d}`
    );
  },
  /**
   * Get a list of who's out, including company holidays.
   * We use this API request to get the official company holidays as it's the only way
   * @param {string} start Start date for the query request
   * @param {string} end End date for the query request
   */
  whosOut(start, end) {
    return bambooAPI.get(`/v1/time_off/whos_out?start=${start}&end=${end}`);
  },
  /**
   * Send the time-off request to BambooHR API
   *
   */
  sendTimeOffRequest(personId, start, end, timeOffTypeId, amount) {
    const xmlData = /* XML */ `
      <request>
          <status>requested</status>
          <start>${start}</start>
          <end>${end}</end>
          <timeOffTypeId>${timeOffTypeId}</timeOffTypeId>
          <amount>${amount}</amount>
      </request>
    `;
    return bambooAPI.put(
      `/v1/employees/${personId}/time_off/request/`,
      xmlData,
      {
        headers: { 'Content-Type': 'text/xml' },
      }
    );
  },
};

module.exports = {
  bambooAPI,
  bambooAPIMethods,
};
