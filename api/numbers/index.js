const axios = require('axios');

/**
 * @type {axios.AxiosInstance}
 */
const numbersAPI = axios.create({
  baseURL: 'http://numbersapi.com/',
  timeout: 6000,
  headers: {
    accept: 'text/plain',
    'accept-encoding': 'gzip, deflate',
    'accept-language': 'en-US,en;q=0.8',
  },
});

const numbersAPIMethods = {
  getTriviaForEmployeeCount(count) {
    return numbersAPI.get(`/${count}/trivia?notfound=floor&fragment`);
  },
};

module.exports = {
  numbersAPI,
  numbersAPIMethods,
};
