const { WebClient } = require('@slack/client');
const { slackApiToken } = process.env;

const slackAPIMethods = {
  /**
   * Gets a promise to request the user information from Slack API
   * associated to the given user ID.
   * @param {string} userId Slack user ID
   */
  getSlackUserInfo(userId) {
    const web = new WebClient(slackApiToken);
    return web.users.info({ user: userId });
  },

  /**
   * Retrieve the profile information from Slack for the given ID
   * @param {string} userId Slack user ID
   */
  getSlackUserProfile(userId) {
    const web = new WebClient(slackApiToken);
    return web.users.profile.get({ user: userId });
  },
};

module.exports = {
  slackAPIMethods,
};
