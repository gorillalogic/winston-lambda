const axios = require('axios');
const MAGIC_KEY = process.env.parkingAPIMagicKey;
/**
 * @type {axios.AxiosInstance}
 */
const parkingAPI = axios.create({
  baseURL: 'https://9pfd6h0h3e.execute-api.us-east-1.amazonaws.com/dev',
  timeout: 10000,
  headers: {
    accept: 'application/json',
    'accept-encoding': 'gzip, deflate',
    'accept-language': 'en-US,en;q=0.8',
    'content-type': 'application/json',
  },
});

const parkingAPIMethods = {
  /**
   * Update the plate number using ParkingBot API
   */
  updateExistingPlate({ previousPlate, newPlate, username }) {
    return parkingAPI.post('/update-existing-plate', {
      previousPlate,
      newPlate,
      username,
      MAGIC_KEY,
    });
  },
};

module.exports = {
  parkingAPI,
  parkingAPIMethods,
};
