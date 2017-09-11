// See API documentation at: https://cloud.google.com/vision/docs/detecting-text

require('dotenv-extended').load();
 
// Google vision service
const Vision = require('@google-cloud/vision');
 
const vision = Vision({
  projectId: process.env.PROJECT_ID,
  keyFilename: process.env.GOOGLE_VISION_KEY_LOCATION
});
 
let testUri = "http://cdn.newsapi.com.au/image/v1/695cf4545bf9ae93079124397bcf43c3";

function textDetection(imageUrl) {
    return new Promise(function(resolve) {
        // TODO: temporaly use testUri for testing emulator as image url has to be public
        vision.textDetection({ source: { imageUri: testUri}})
        .then((results) => {
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
