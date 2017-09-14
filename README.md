#Chatbot Receipt

## Overview

This is a chatbot for managing receipts. Here's what you can do with the bot:

- Upload a photo of your receipt. The bot will read the photo and extract key information including the ABN and the total purchase amount. The marchant name is inferred from the ABN usng ABR look up service.
- Find a receipt using merchant name (not implemented as I don't intent to deploy the bot nor store images on the cloud).

## Main components

Main components and the relevant frameworks used:

- Chatbot -- this is essentially a web server and is implemented using the [Microsoft Bot Builder Framework](https://docs.microsoft.com/en-us/bot-framework)
- Text detection -- extracting text from images with the [Google Cloud Vision service](https://cloud.google.com/vision/)
- Organisation / merchant name extraction with [ABN look up service](https://abr.business.gov.au/) by the Australian Business Register 
- Information extraction with regular expression 

## How to build

As this bot was built using the Microsoft Bot Builder Framework with NodeJS SDK, you can find the detailed documentation on its [homepage](https://docs.microsoft.com/en-us/bot-framework/nodejs/bot-builder-nodejs-quickstart). You will need to install Node and all dependent packages in `package.json`.

