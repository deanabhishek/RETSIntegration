const admin = require("firebase-admin");
const serviceAccount = require("./gobyhomes-qa-firebase-adminsdk-3r0gx-ac944a27b6.json");
const RETS = require("node-rets");
const fs = require("fs");

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

const imageUpload = async () => {
  const listingChunks = await getListingIds(); // Get the listing IDs
  console.log("Listing IDs fetched", listingChunks[0]);
  let records = [];

  for (let j = 0; j < listingChunks.length; j++) {
    const id = listingChunks[j];
    console.log(`Fetching images for listing ID ${listingChunks[j]}`);
    try {
      const query = await client.search(
        "Media",
        "PROP_MEDIA",
        `(ListingId=${id})`,
        {
          Select:
            "ListingId,MediaURL,MediaURLFull,MediaURLHD,MediaURLHiRes,MediaURLThumb,MediaURLMedium",
        }
      );
      if (query.Objects && query.Objects.length > 0) {
        for (let k = 0; k < query.Objects.length; k++) {
          const record = query.Objects[k];
          console.log("Record", record);
          records.push(record);
        }
      }
    } catch (err) {
      console.error(`Error searching for ListingId ${id}: ${err.message}`);
      continue; // Skip to next iteration of the loop
    }
  }

  await addRecordsToFirestoreImage(records, "Media");

  console.log(`Uploaded batch ${i + 1}/${listingChunks.length}`);
};

const getListingIds = async () => {
  try {
    const now = new Date();

    // Subtract 45 minutes from the current datetime
    const fortyFiveMinutesAgo = new Date(now.getTime() - 45 * 60000);

    // Format the datetime string without the timezone indicator
    const formattedTime = fortyFiveMinutesAgo.toISOString().slice(0, -1);
    const currentDate = new Date(now.getTime()).toISOString().slice(0, -1);

    function getTodayDate() {
      const today = new Date();
      const year = today.getFullYear();
      const month = (today.getMonth() + 1).toString().padStart(2, "0");
      const day = today.getDate().toString().padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    const listingIdData = await client.search(
      "Property",
      "ALL",
      `(StandardStatus=|Active,Pending,Active Under Contract) AND (MLSListDate=${getTodayDate()}) AND (ModificationTimestamp=${formattedTime}-${currentDate})`,
      {
        Select: "ListingId",
      }
    );
    const listingIds = listingIdData.Objects.map((obj) => obj.ListingId);
    return listingIds;
  } catch (err) {
    console.error("Error getting listing IDs", err.message);
    return err;
  }
};

const addRecordsToFirestoreImage = async (records, className) => {
  try {
    const collectionRef = db.collection("propertyDataImages");
    const batchSize = 1000; // Set the batch size as per your requirement
    let batchCount = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = db.batch();

      for (let j = i; j < i + batchSize && j < records.length; j++) {
        const record = records[j];
        const docRef = collectionRef.doc();
        batch.set(docRef, {
          ...record,
          className,
        });
      }

      await batch.commit();
      batchCount++;
      console.log(
        `Successfully added ${batchSize} records to firestore. Batch ${batchCount}`
      );
    }

    console.log(
      `Successfully added all ${records.length} records to firestore.`
    );
  } catch (err) {
    return err;
  }
};

exports.imageUpload = imageUpload;
