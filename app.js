// This loads environment variables from .env file -- uncomment for production / 
// remote bot server
// Comment for local testing
require('dotenv-extended').load();

// 4. Display information to correct
// 5. Search receipt => retrieve receipt from some location
// 6. Summarise / Finance management etc

// Setup Restify Server
var restify = require('restify');
var builder = require('botbuilder');
var nlp = require('./nlp');
var vision = require('./text-detection');
var util = require('util');

const SAVE_RECEIPT = 'Save a receipt';
const FIND_RECEIPT = 'Find a receipt';

//=========================================================
// Bot Setup
//=========================================================

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

server.post('/api/messages', connector.listen());

// Create our IntentDialog and add recognizers
var intents = new builder.IntentDialog({
    recognizers: [
        new builder.RegExpRecognizer('Save', /save/i),
        new builder.RegExpRecognizer('Find', /find/i)
    ]
});

// TODO: add bye, help messages 
intents.matches('Save', 'dialogSaveReceipt');
intents.matches('Find', 'dialogFindReceipt');

var bot = new builder.UniversalBot(connector);
// This works
intents.onDefault(
    //(session) => { session.send('unknow intent')}
    [
        function (session, args, next) {
            session.send('Greetings!');
            if (!session.userData.name) {
                session.beginDialog('getFirstName');
            } else {
                next();
            }
        },
        function (session, results, next) {
            var choices = [SAVE_RECEIPT, FIND_RECEIPT];
            var msg = util.format('What would you like to do today, %s?', session.userData.name)
            builder.Prompts.choice(session, msg, choices,
                { listStyle: builder.ListStyle.button });
        },
        function (session, results) {
            if (results.response.entity === SAVE_RECEIPT) {
                session.beginDialog('dialogSaveReceipt');
            } else {
                session.beginDialog('dialogFindReceipt');
            }
        }
    ]
);
// But this doesn't as it will always invoke dialog greetings, possibly a bug in the library?
//intents.onDefault('dialogGreetings');
bot.dialog('/', intents);

bot.use(builder.Middleware.dialogVersion({
    version: 1.0,
    message: 'Conversation restarted by a main update',
    resetCommand: /^reset/i
}));

//=========================================================
// Bots Dialogs
//=========================================================
// Messages to use
var messages = {
    ask_name: 'What should I call you?'
}

bot.dialog('getFirstName', [
    function (session) {
        builder.Prompts.text(session, 'I\'m here to help you with managing your receipts. What should I call you?');
    },
    function (session, result) {
        session.userData.name = result.response;
        session.send('Great to meet you, %s', session.userData.name);
        session.endDialog();
    }
]);

bot.dialog('dialogBye', [
    function (session) {
        session.endDialog('Farewell!');
    }
]);

bot.dialog('Help', [
    function (session) {
        session.endDialog("I can't help you right now...");
    }
]);

bot.dialog('dialogSaveReceipt', [
    // Prompt for photo of receipt 
    function (session, args, next) {
        builder.Prompts.attachment(
            session,
            'Too easy. Just upload a photo of your receipt and I\'ll take care of it for you.'
        )
    },

    // process receipt 
    function (session, results, next) {
        //var attachments = session.message.attachments;
        var attachments = results.response;
        if (attachments.length) {
            console.log('received %d attachments', attachments.length);
            var attachment = attachments[0];
            var contentType = attachment.contentType;
            var imageUrl = attachment.contentUrl;
            console.log('Got attachment of type %s and url %s', contentType, imageUrl);
            session.send('Reading receipt...');
            session.sendTyping();
            // imageUrl is local so does not work on emulator ...
            vision.textDetection(imageUrl).then((text) => {
                console.log('text: %s', text);
                var receipt = nlp.extractReceiptInformation(text);
                console.log('receipt: %s', JSON.stringify(receipt));
                nlp.getOrganisationName(receipt.abn).then((merchantName) => {
                    console.log('merchant name: %s', merchantName);
                    receipt['merchantName'] = merchantName;
                    // save in userData
                    session.userData.receipt = receipt;
                    session.beginDialog('confirmReceipt');
                });
            });
        }
    },

    function (session, results) {
        session.send('All good, I\'ve saved your receipt. You can retrieve it in the future by telling me the merchant name.');
        session.endDialog();
    }
]);

// Adaptive card needs to be in its own dialog?
bot.dialog('confirmReceipt', function (session) {
    console.log('in the dialog');
    console.log('session.message: %s', session.message);
    console.log('session.message.value: %s', session.message.value);
    if (session.message && session.message.value) {
        console.log('calling processSubmitAction');
        processSubmitAction(session, session.message.value);
        return;
    }
    var receipt = session.userData.receipt;
    var confirmation = {
        "contentType": "application/vnd.microsoft.card.adaptive",
        "content": {
            "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
            "type": "AdaptiveCard",
            "version": "1.0",
            "body": [
                {
                    "type": "TextBlock",
                    "text": "Correct information?",
                    "weight": "bolder",
                    "size": "large"
                },
                {
                    "type": "TextBlock",
                    "text": "Merchant name"
                },
                {
                    "type": "Input.Text",
                    "id": "merchantName",
                    "value": receipt.merchantName,
                    "style": "text"
                },
                {
                    "type": "TextBlock",
                    "text": "Total"
                },
                {
                    "type": "Input.Text",
                    "id": "total",
                    "value": receipt.total,
                    "style": "text"
                }
            ],
            "actions": [
                {
                    "type": "Action.Submit",
                    "title": "Save",
                    "speak": "<s>Save</s>",
                    "data": {
                        "type": "SaveReceipt"
                    }
                }
            ]
        }
    }
    var msg = new builder.Message(session)
        .addAttachment(confirmation);
    session.send(msg);
})

function processSubmitAction(session, value) {
    console.log('process submit action called; value: %s, %s', value.merchantName, value.total);
    var defaultErrorMessage = 'Please complete all the parameters';
    switch (value.type) {
        case 'SaveReceipt':
            if (value.merchantName != '' & value.total != '') {
                session.userData.receipt = value;
                session.endDialogWithResult({ receipt: value });
                break;
            } else {
                session.send(defaultErrorMessage);
                return;
            }

        default:
            session.send(defaultErrorMessage);
    }
}

bot.dialog('dialogFindReceipt', [
    function (session) {
        session.send('ok, finding receipt');
        session.endDialog();
    }
]);