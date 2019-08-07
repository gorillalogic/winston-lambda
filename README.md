# Winston

As a company grows, more and more information is generated. This information comprises HR policies, administrative and technical processes, company benefits and IT know-how. As the resources within the company increase, the need to place them in an easily-accessible repository becomes critical.

In response to this issue, a few of us at Gorilla Labs decided to create a Slack-integrated chatbot. The chatbot was implemented using [Amazon Web Services Lex](https://aws.amazon.com/lex/), and the final solution only incorporated AWS and Slack-provided services. Our use of servers was limited, as we wanted to keep the cost of the project to a minimum. We decided to name our assistant chatbot “Winston.”

While Amazon Lex provides both speech recognition and natural language understanding, our scope for this project was to create a text-based chatbot using only Lex’s natural language understanding. This functionality makes Winston a useful Slack-integrated application without limiting its ability to one day be integrated it into a speech interface such as [Amazon Alexa](https://developer.amazon.com/alexa).

This repository represents the code for the AWS lambda function that handles specific intents supported by the chatbot. The whole idea of using a lambda function is to keep costs at the minimum.

## Documentation

If you want to check all the intents supported by Winston please take a look at the [Winston's Questions Set](https://docs.google.com/document/d/140Q0-JOVqfQer1HhfP1ux1Ut3E_yvEjpp7Opf2l4rOQ/edit). When you add or correct utterances please do so in **Suggesting** mode so is evident for developers reviewing the document which changes to apply to the actual bot on Amazon Lex.

## Amazon Lex

The Amazon Lex bot can be found here: [Winston bot](https://console.aws.amazon.com/lex/home?region=us-east-1#bot-editor:bot=Winston). You will need an AIM role and the proper permissions to be able to edit the bot using the dashboard.

### Adding intents

We use Pascal Case for the intent names on Amazon Lex. When adding new intents please ensure the name is meaningful and comprehensive try using prefix that give hint of category. For instance: _"SmallTalkSayHello"_ could be a good name for a "say hello" intent.
Don't forget to add the new intent to the [Winston's Questions Set](https://docs.google.com/document/d/140Q0-JOVqfQer1HhfP1ux1Ut3E_yvEjpp7Opf2l4rOQ/edit) documentation.

## Deployment

To upload changes to the AWS lambda function you can use [Serverless Framework](https://serverless.com/). The configuration file _serverless.yml_ is not part of the repository because it contains the secret API keys (This is a bad practice those should be handled by using a key management service such as [Amazon KMS)](https://aws.amazon.com/kms/).

To install serverless use the following command:

    npm install -g serverless

To configure use the [Serverless Config Credentials](https://serverless.com/framework/docs/providers/aws/cli-reference/config-credentials) command with the credentials provided by your own AWS user.

```
serverless config credentials --provider aws --key YOURKEY --secret YOURSECRET --overwrite

Serverless: Setting up AWS...
Serverless: Saving your AWS profile in "~/.aws/credentials"...
Serverless: Success! Your AWS access keys were stored under the "default" profile.
```

#### Inspect `~/.aws/credentials` file

`code ~/.aws/credentials`

```
[default]
aws_access_key_id = YOURKEY
aws_secret_access_key = YOURSECRET
```

### serverless.yml

This is the content of the configuration file for serverless. The environment variables should be requested to the project owner.

    service: winstonbot

    provider:
      name: aws
      runtime: nodejs8.10

    functions:
      winstonbot:
        handler: handler.winstonbot
        environment:
          bambooApiKey: xxx
          slackApiToken: xxx
          parkingAPIMagicKey: xxx

To deploy the lambda function use the following command:

    serverless deploy

## Assets

The design work for the bot was done by our UI/UX designer Ana Beatriz Bravo.

#### Banner (used for Google DialogFlow version)

![Used only for DialogFlow version of the chatbot](https://res.cloudinary.com/greivinlopez/image/upload/v1565191812/Winston/Assets/Winston_GoogleAssistantBanner.png)

Download the original image from here: [Winston_GoogleAssistantBanner.png](https://res.cloudinary.com/greivinlopez/image/upload/v1565191812/Winston/Assets/Winston_GoogleAssistantBanner.png)

#### Slack App Icon

![enter image description here](https://res.cloudinary.com/greivinlopez/image/upload/v1565191812/Winston/Assets/Winston_192x192.png)

Download the original image from here: [Winston_192x192.png](https://res.cloudinary.com/greivinlopez/image/upload/v1565191812/Winston/Assets/Winston_192x192.png)

#### Full Size Icon

![enter image description here](https://res.cloudinary.com/greivinlopez/image/upload/v1565191812/Winston/Assets/Winston_512x512.png)

Download the original image from here: [Winston_512x512.png](https://res.cloudinary.com/greivinlopez/image/upload/v1565191812/Winston/Assets/Winston_512x512.png)
