// const validateAppleRow = require("../utils/validateAppleRow");
const xlsx = require("xlsx");
const { MongoClient } = require("mongodb");
const fs = require("fs");
const { Parser } = require("json2csv");
require("dotenv").config();

// Load Excel data
const workbook = xlsx.readFile("../RawData/Complete_Apple_Dataset.xlsx");
const sheetName = workbook.SheetNames[0];
const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

// MongoDB connection URI
// const uri = process.env.MONGO_URI || "mongodb+srv://appleexplorer4990:%40Comp4990@cluster0.pilg7sk.mongodb.net/AppleExplorer?retryWrites=true&w=majority&appName=Cluster0";
const uri = "mongodb://localhost:27017/AppleExplorer"
const client = new MongoClient(uri);

async function importData() {
  try {
    await client.connect();
    const db = client.db("AppleExplorer");

    const applesCol = db.collection("Apples");
    const profileCol = db.collection("AppleProfile");
    const attrCol = db.collection("PhysicalAttributes");
    const originCol = db.collection("Origin");

    let importedCount = 0;
    let errorLog = [];
    let duplicateLog = [];

    for (const row of data) {
      // Check for duplicate by ACCESSION
      const existing = await applesCol.findOne({ accession: row["ACCESSION"] });
      if (existing) {
        console.log(` Duplicate found (ACCESSION: ${row['ACCESSION']}) - skipping`);
        duplicateLog.push({
          accession: row['ACCESSION'],
          cultivarName: row['CULTIVAR NAME'],
          reason: "Duplicate ACCESSION",
          ...row
        });
        continue;
      }

      // AppleProfile
      const profile = {
        genus: row['E GENUS'] || null,
        species: row['E SPECIES'] || null,
        pedigree: row['E pedigree'] || null
      };
      const { insertedId: profileId } = await profileCol.insertOne(profile);

      // PhysicalAttributes
      const attributes = {
        color: row['COLOUR'] || row['E color'] || null,
        weight: parseFloat(row['Weight'] || row['E quant (Quantity)']) || null,
        density: parseFloat(row['DENSITY']) || null,
        FRUITSHAPE: parseFloat(row['FRUITSHAPE 115057']) || null,
        FRUITLGTH: parseFloat(row['FRUITLGTH 115156']) || null,
        FRUITWIDTH: parseFloat(row['FRUITWIDTH 115157']) || null,
        FRTWEIGHT: parseFloat(row['FRTWEIGHT 115121']) || null,
        FRTSTEMTHK: parseFloat(row['FRTSTEMTHK 115127']) || null,
        FRTTEXTURE: parseFloat(row['FRTTEXTURE 115123']) || null,
        FRTSTMLGTH: parseFloat(row['FRTSTMLGTH 115158']) || null,
        FRTFLSHOXI: parseFloat(row['FRTFLSHOXI 115129']) || null,
        SEEDCOLOR: parseFloat(row['SEEDCOLOR 115086']) || null,
        SSIZE: parseFloat(row['SSIZE Quantity of Seed']) || null,
        SEEDLENGTH: parseFloat(row['SEEDLENGTH 115163']) || null,
        SEEDWIDTH: parseFloat(row['SEEDWIDTH 115164']) || null,
        SEEDNUMBER: parseFloat(row['SEEDNUMBER 115087']) || null,
        SEEDSHAPE: parseFloat(row['SEEDSHAPE 115167']) || null,
        
      };
      const { insertedId: attrId } = await attrCol.insertOne(attributes);

      // Origin
      const origin = {
        country: row['E Origin Country'] || row['COUNTRY'] || null,
        province: row['E Origin Province'] || row['PROVINCE/STATE'] || null,
        city: row['E Origin City'] || row['City'] || null
      };
      const { insertedId: originId } = await originCol.insertOne(origin);

      //  Apple
      const apple = {
        acno: row['ACNO'] || null,
        accession: row['ACCESSION'],
        cultivarName: row['CULTIVAR NAME'],
        tasteNotes: row['CMT'] || null,
        notes: row['SITECMT'] || null,
        siteId: row['SITE ID'] || null,
        prefix: row['PREFIX (ACP)'] || null,
        family: row['FAMILY'] || null,
        habitat: row['HABITAT'] || null,
        inventoryType: row['INVENTORY TYPE'] || null,
        inventoryMaintenancePolicy: row['INVENTORY MAINTENANCE POLICY'] || null,
        maintenancePolicy: row['MAINTENANCE POLICY'] || null,
        plantType: row['PLANT TYPE'] || null,
        isDistributable: row['IS DISTRIBUTABLE?'] || null,
        firstBloomDate: parseInt(row['FIRST BLOOM DATE']) || null,
        fullBloomDate: parseInt(row['FULL BLOOM DATE']) || null,
        fireblightRating: row['FIREBLIGHT RATING'] || null,
        taxon: row['TAXON'] || null,
        narativeKeyword: row['NARATIVEKEYWORD'] || null,
        fullNarative: row['FULL NARATIVE'] || null,
        pedigreeDescription: row['PEDIGREE DESCRIPTION'] || null,
        availabilityStatus: row['AVAILABILITY STATUS '] || null,
        locationSelection : {
            loc1: row['LOCATION SECTION 1'] || null,
            loc2: row['LOCATION SECTION 2'] || null,
            loc3: row['LOCATION SECTION 3'] || null,
            loc4: row['LOCATION SECTION 4'] || null,
        },
        cooperator: row['COOPERATOR'] || null,
        IPR: row['IPR TYPE'] || null,
        labelName: row['LABEL NAME'] || null,
        levelOfImprovement: row['LEVEL OF IMPROVEMENT'] || null,
        releasedDate: row['RELEASED DATE'] || null,
        releasedDateFormat: row['RELEASED DATE FORMAT'] || null,
        cooperatorNew: row['COOPERATOR_NEW'] || null,
        imageId: null,
        appleProfileId: profileId,
        physicalAttributesId: attrId,
        originId: originId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await applesCol.insertOne(apple);
      importedCount++;
    }
 
    //  Export Errors
    if (errorLog.length > 0) {
      fs.writeFileSync("import-errors.json", JSON.stringify(errorLog, null, 2));
      console.log(` Exported ${errorLog.length} skipped rows to 'import-errors.json'`);

      try {
        const fields = Object.keys(errorLog[0]);
        const parser = new Parser({ fields });
        const csv = parser.parse(errorLog);
        fs.writeFileSync("import-errors.csv", csv);
        console.log(` Also saved 'import-errors.csv'`);
      } catch (err) {
        console.error(" Failed to export error CSV:", err);
      }
    }

    //  Export Duplicates
    if (duplicateLog.length > 0) {
      fs.writeFileSync("duplicate-entries.json", JSON.stringify(duplicateLog, null, 2));
      console.log(` Exported ${duplicateLog.length} duplicate rows to 'duplicate-entries.json'`);

      try {
        const fields = Object.keys(duplicateLog[0]);
        const parser = new Parser({ fields });
        const csv = parser.parse(duplicateLog);
        fs.writeFileSync("duplicate-entries.csv", csv);
        console.log(` Also saved 'duplicate-entries.csv'`);
      } catch (err) {
        console.error(" Failed to export duplicate CSV:", err);
      }
    }

    console.log(` Done! Imported ${importedCount} apple entries.`);
  } catch (err) {
    console.error(" Import failed:", err);
  } finally {
    await client.close();
  }
}

importData();
