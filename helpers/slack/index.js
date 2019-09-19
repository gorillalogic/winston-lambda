module.exports = {
  /**
   * Extracts the user ID needed for calls to the Slack API as sent by the client
   * @param {Object} intentRequest Intent request information
   * @returns {string} The user ID for the Slack API coming on the client request
   */
  getSlackUserId(intentRequest) {
    /**
     * @todo: Check if the request actually came from Slack.
     * Under requestAttributes (from event) you can check the presence of
     * x-amz-lex:channel-type.
     * The value will be Slack if the user comes from slack.
     */
    let { userId } = intentRequest;
    userId = userId.slice(userId.lastIndexOf(':') + 1);
    return userId;
  },
};
