/*
    importToMongo.js must be ran before this.
    These functions make additions to that file using the 2013Databse.xlsx file.
*/


const xlsx = require("xlsx");
const { MongoClient, Double, ObjectId } = require("mongodb");

const uri = "mongodb://localhost:27017/AppleExplorer"; 
const client = new MongoClient(uri);

const workbook = xlsx.readFile("RawData/2013Database.xlsx");
const NarrativeWorkbook = xlsx.readFile("RawData/Narrative.xlsx");

async function updateNarratives() {

  try {
    // Load Excel File
    const sheetName = workbook.SheetNames[0]; //Narrative
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Connect to Database
    await client.connect();
    const db = client.db("AppleExplorer");
    const applesCol = db.collection("Apples");

    const narrativeMap = new Map();
    rows.forEach(row => {
      if (row["HARROW ACCESSION"]) {
        narrativeMap.set(
          String(row["HARROW ACCESSION"]).trim(),
          row["Narrative"] || null // empty string if no narrative
        );
      }
    });

    console.log(`Loaded ${narrativeMap.size} narrative entries from Excel.`);

    let updatedCount = 0;

    // Loop through Excel entries and update matching Apple documents
    // TODO: LOG Apples that have an error
    for (const [accession, narrative] of narrativeMap.entries()) {
      const result = await applesCol.updateOne(
        { accession: accession },
        { $set: { narrative } } 
      );

      if (result.matchedCount > 0) {
        //console.log(`Updated ACCESSION ${accession}`);
        updatedCount++;
      }
    }

    console.log(`Done. Updated ${updatedCount} Apple documents with narrative.\n`);
  } catch (err) {
    console.error("Error updating narratives:", err);
  } finally {
    await client.close();
  }
}

async function updateLengthAndWidth(){
    try {
    // Load Excel File
    const sheetName = workbook.SheetNames[2]; //Descriptors
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    
    // Connect to Database
    await client.connect();
    const db = client.db("AppleExplorer");
    const applesCol = db.collection("Apples");
    const attrCol = db.collection("PhysicalAttributes");

    const dimensionsMap = new Map();
    rows.forEach(row => {
      if (row["ACID"]) {
        dimensionsMap.set(
          String(row["ACID"]).trim(),
          [Number(row["FRUITLGTH 115156"]) || null, Number(row["FRUITWIDTH 115157"]) || null]
        );
      }
    });

    console.log(`Loaded ${dimensionsMap.size} length + width entries from Excel.`);

    let updatedCount = 0;

    // TODO: LOG Apples that have an error
    for (const [accession, dimensions] of dimensionsMap.entries()) {
        const apple = await applesCol.findOne({ accession: accession });
        const length = dimensions[0];
        const width = dimensions[1];

        if (!apple) {
            //console.warn(`No apple found with accession: ${accession}`);
            continue; // skip this iteration
        }

        const attrID = apple.physicalAttributesId;
        if (!attrID) {
            //console.warn(`Apple with accession ${accession} has no physicalAttributesId`);
            continue;
        }

        //console.log(dimensionsMap);

        const result = await attrCol.updateOne(
            { _id: new ObjectId(attrID) },
            { $set: { length, width } } 
        );

        if (result.matchedCount > 0) {
            updatedCount++;
        }
        //console.log(`Updated ${attrID}`);
    }

    console.log(`Done. Updated ${updatedCount} PhysicalAttributes with length + width.\n`);
  } catch (err) {
    console.error("Error updating length + width:", err);
  }
}

async function updateTaxon(){
    try {
    // Load Excel File
    const sheetName = workbook.SheetNames[8]; //Inventory
    const rows = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
    
    // Connect to Database
    await client.connect();
    const db = client.db("AppleExplorer");
    const applesCol = db.collection("Apples");
    const profileCol = db.collection("AppleProfile");

    const taxonMap = new Map();
    rows.forEach(row => {
      if (row["Inventory Number"]) {
        taxonMap.set(
          String(row["Inventory Number"]).trim(),
          String(row["TAXON"]) || null
        );
      }
    });

    console.log(`Loaded ${taxonMap.size} taxon entries from Excel.`);

    let updatedCount = 0;

    // TODO: LOG Apples that have an error
    for (const [accession, taxon] of taxonMap.entries()) {
        const apple = await applesCol.findOne({ accession: accession });

        if (!apple) {
            //console.warn(`No apple found with accession: ${accession}`);
            continue;
        }

        const profileId = apple.appleProfileId;
        if (!profileId) {
            //console.warn(`Apple with accession ${accession} has no appleProfileId`);
            continue;
        }

        const result = await profileCol.updateOne(
            { _id: new ObjectId(profileId) },
            { $set: { taxon } } 
        );

        if (result.matchedCount > 0) {
            updatedCount++;
        }
        //console.log(`Updated ${profileId}`);
    }

    console.log(`Done. Updated ${updatedCount} AppleProfile with taxon.\n`);
  } catch (err) {
    console.error("Error updating taxon:", err);
  }
}

// Uses data from Narrative.XLSX instead of 2013Database.XLSX
// PROBLEM: There are multiple Narratives for some Accession Numbers
async function updateNarrativesLongForm(){
    try {
    // Load Excel File
    const sheetName = NarrativeWorkbook.SheetNames[0]; //Narrative
    const rows = xlsx.utils.sheet_to_json(NarrativeWorkbook.Sheets[sheetName]);

    // Connect to Database
    await client.connect();
    const db = client.db("AppleExplorer");
    const applesCol = db.collection("Apples");

    const narrativeMap = new Map();
    rows.forEach(row => {
      if (row["HARROW ACCESSION"]) {
        narrativeMap.set(
          String(row["HARROW ACCESSION"]).trim(),
          row["Narrative"] || null // empty string if no narrative
        );
      }
    });

    console.log(`Loaded ${narrativeMap.size} narrative entries from Excel.`);

    let updatedCount = 0;

    // Loop through Excel entries and update matching Apple documents
    // TODO: LOG Apples that have an error
    for (const [accession, narrative] of narrativeMap.entries()) {
      const result = await applesCol.updateOne(
        { accession: accession },
        { $set: { narrative } } 
      );

      if (result.matchedCount > 0) {
        //console.log(`Updated ACCESSION ${accession}`);
        updatedCount++;
      }
    }

    console.log(`Done. Updated ${updatedCount} Apple documents with narrative.\n`);
  } catch (err) {
    console.error("Error updating narratives:", err);
  }
}

async function run(){
  // updateNarratives();
  await updateNarrativesLongForm();
  await updateLengthAndWidth();
  await updateTaxon();
  await client.close();
}

run();
