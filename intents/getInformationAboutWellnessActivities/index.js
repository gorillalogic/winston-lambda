const { google } = require('googleapis');
const moment = require('moment');
const lex = require('../../helpers/lex');
const wellness = require('../../helpers/wellness');
const googleCalendar = require('../../api/google/calendar');
const { humanDate } = require('../../helpers/formatters/date');

const getInformationAboutWellnessActivities = async (
  intentRequest,
  callback
) => {
  const activity = intentRequest.currentIntent.slots.wellness;
  if (!activity || wellness.wellnessActivities.indexOf(activity) === -1) {
    const errorMessage = `Sorry I didn't get the intended activity name`;
    lex.fulfillWithSuccess(intentRequest, callback, errorMessage);
    return;
  }
  const calendar = google.calendar('v3');
  const timeMin = moment(new Date());
  try {
    const response = await calendar.events.list({
      auth: googleCalendar.serviceAccountAuth,
      calendarId: googleCalendar.calendarId,
      timeMin: timeMin.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });
    const events = response.data.items;
    const [event] = events.filter(e => e.summary === activity);
    if (!event) {
      const noEventsFoundMessage = `No events found`;
      lex.fulfillWithSuccess(intentRequest, callback, noEventsFoundMessage);
      return;
    }
    const readableActivity = `Next ${activity} activity will be ${humanDate(
      moment,
      event.start.dateTime
    )}`;
    const additionalText = event.description
      ? `${event.description}. To stay up to date with the coming activities visit the company's portal.`
      : `To stay up to date with the coming activities visit the company's portal.`;
    const eventsUrl = 'https://band.gorillalogic.com/events/';
    const message = `${readableActivity}\n${additionalText}\nSee events:\n${eventsUrl}`;
    lex.fulfillWithSuccess(intentRequest, callback, message);
  } catch (error) {
    console.log(error);
    lex.fulfillWithError(intentRequest, callback, error);
  }
};

module.exports = getInformationAboutWellnessActivities;
