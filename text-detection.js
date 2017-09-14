// See API documentation at: https://cloud.google.com/vision/docs/detecting-text

require('dotenv-extended').load();
var request = require('request-promise').defaults({ encoding: null });

// Google vision service
const Vision = require('@google-cloud/vision');

const vision = Vision({
    projectId: process.env.PROJECT_ID,
    keyFilename: process.env.GOOGLE_VISION_KEY_LOCATION
});

let testUri = "http://cdn.newsapi.com.au/image/v1/695cf4545bf9ae93079124397bcf43c3";

function textDetection(imageUrl) {
    return new Promise(function (resolve) {
        request(imageUrl).then((response) => {
            return vision.textDetection({ content: new Buffer(response).toString("base64") });
        }).then((results) => {
            const detections = results[0].textAnnotations;
            console.log('Text: ', detections[0]);
            resolve(detections[0].description);
        }).catch((error) => {
            console.log(error);
        });
    });
}

var exports = module.exports = {
    textDetection: textDetection
}
