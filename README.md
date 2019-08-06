# Winston

As a company grows, more and more information is generated. This information comprises HR policies, administrative and technical processes, company benefits and IT know-how. As the resources within the company increase, the need to place them in an easily-accessible repository becomes critical.

In response to this issue, a few of us at Gorilla Labs decided to create a Slack-integrated chatbot. The chatbot was implemented using [Amazon Web Services Lex](https://aws.amazon.com/lex/), and the final solution only incorporated AWS and Slack-provided services. Our use of servers was limited, as we wanted to keep the cost of the project to a minimum. We decided to name our assistant chatbot “Winston.”

While Amazon Lex provides both speech recognition and natural language understanding, our scope for this project was to create a text-based chatbot using only Lex’s natural language understanding. This functionality makes Winston a useful Slack-integrated application without limiting its ability to one day be integrated it into a speech interface such as [Amazon Alexa](https://developer.amazon.com/alexa).

This repository represents the code for the AWS lambda function that handles specific intents supported by the chatbot.

# Documentation

If you want to check all the intents supported by Winston please take a look at the [Winston's Questions Set](https://docs.google.com/document/d/140Q0-JOVqfQer1HhfP1ux1Ut3E_yvEjpp7Opf2l4rOQ/edit).
