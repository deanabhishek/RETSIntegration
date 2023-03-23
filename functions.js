const functions = require("firebase-functions");
const admin = require("firebase-admin");
const gobyHomes = require("./insertion");
const recordUpdate = require("./updation");

admin.initializeApp();
exports.retsDataInsertion = functions.pubsub
  .schedule("* /30 * * * *")
  .onRun(async (context) => {
    await gobyHomes();
    return null;
  });

exports.retsDataUpdation = functions.pubsub
  .schedule("* /45 * * * *")
  .onRun(async (context) => {
    await recordUpdate();
    return null;
  });
