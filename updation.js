const admin = require("firebase-admin");
const serviceAccount = require("./gobyhomes-qa-firebase-adminsdk-3r0gx-ac944a27b6.json");
const RETS = require("node-rets");
const fs = require("fs");
const feildsValues = require("./selected_feild.js");
const keyMapping = require("./name_change.js");
const image_list = require("./image_list.js");
const main_field = require("./main_field.js");
const addres_field = require("./addres_field.js");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://gobyhomes-qa.firebaseio.com",
});

const client = RETS.initialize({
  loginUrl: "http://bright-rets.brightmls.com:6103/cornerstone/login",
  username: "3348441",
  password: "vUjeyasAmepri7eqehIPhifib",
  version: "RETS/1.8",
  userAgent: "Bright RETS Application/1.0",
  logLevel: "info",
});

const db = admin.firestore();

const temp = fs.readFileSync("metaDataLookup.json");
const lookupValues = JSON.parse(temp);

const recordUpdate = async () => {
  const now = new Date();
  console.log(now);

  const fortyFiveMinutesAgo = new Date(now.getTime() - 30 * 60000);

  const formattedTime = fortyFiveMinutesAgo.toISOString().slice(0, -1);
  const currentDate = new Date(now.getTime()).toISOString().slice(0, -1);
  console.log(formattedTime, currentDate);

  const temp = await client.search(
    "Property",
    "ALL",
    `(StandardStatus=|Active,Pending,Active Under Contract) AND (ModificationTimestamp=${formattedTime}+)`,

    {
      Select: feildsValues.join(","),
    }
  );
  let allRecords = [];
  allRecords = allRecords.concat(temp.Objects);
  const recordsWithUpdatedFields = allRecords.map(mapRecord);
  recordsWithUpdatedFields.map((item, id) => {
    console.log(id);
    crossCheckRecords(item);
  });
};
const mapRecord = (record, key) => {
  console.log(key);
  const updatedRecord = {};
  Object.keys(record).forEach((field) => {
    const fieldValues = record[field].split(",");
    const updatedFieldValues = fieldValues.map((value) => {
      const matchingLookup = lookupValues.find(
        (lookup) => lookup.MetadataEntryID === value.trim()
      );
      if (matchingLookup) {
        return matchingLookup.LongValue;
      }

      return value;
    });
    if (keyMapping.hasOwnProperty(field)) {
      if (!updatedRecord.hasOwnProperty("other_data")) {
        updatedRecord["other_data"] = {};
      }
      const newField = keyMapping[field] || field;
      updatedRecord["other_data"][newField] = updatedFieldValues.join(",");
    } else {
      // Check if the field name exists in the main_field
      if (main_field.hasOwnProperty(field)) {
        // If it exists in main_field's key, use the value as the new field name
        const newField = main_field[field];
        updatedRecord[newField] = updatedFieldValues.join(",");
      } else {
        // Check if the field name exists in address_field
        if (addres_field.hasOwnProperty(field)) {
          // If it exists in address_field's key, add it to the array of addresses in updatedRecord
          if (!updatedRecord.hasOwnProperty("address")) {
            updatedRecord["address"] = {};
          }
          const newField = addres_field[field];
          updatedRecord["address"][newField] = updatedFieldValues.join(",");
        } else {
          if (image_list.hasOwnProperty(field)) {
            if (!updatedRecord.hasOwnProperty("image")) {
              updatedRecord["image"] = {};
            }
            const newField = image_list[field];
            updatedRecord["image"][newField] = updatedFieldValues.join(",");
          } else {
            // None of the above, use the field name as is
            updatedRecord[field] = updatedFieldValues.join(",");
          }
        }
      }
    }
  });
  return updatedRecord;
};

const crossCheckRecords = async (value) => {
  try {
    const collection = db.collection("propertyData");
    const querySnapshot = await collection
      .where("listing_id", "==", value["listing_id"])
      .get();
    if (!querySnapshot.empty) {
      querySnapshot.forEach((doc) => {
        collection
          .doc(doc.id) // <-- call doc method on collection object
          .update(value)
          .then(() => {
            console.log(`${value["listing_id"]}`, "is updated");
          })
          .catch((err) => {
            console.log(err);
          });
      });
    } else {
      console.log("Nothing Found");
    }
  } catch (error) {
    console.log(error);
  }
};

module.exports = recordUpdate;
