const validateAppleRow = require("./utils/validateAppleRow");
const xlsx = require("xlsx");
const { MongoClient } = require("mongodb");
const fs = require("fs");
const { Parser } = require("json2csv");
require("dotenv").config();

// Load Excel data
const workbook = xlsx.readFile("RawData/TDInventory.xlsx");
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
      // Validate the row
      const validationErrors = validateAppleRow(row);
      if (validationErrors.length > 0) {
        console.log(` Skipping row (ACCESSION: ${row['ACCESSION'] || "N/A"}):`, validationErrors);
        errorLog.push({
          accession: row['ACCESSION'] || null,
          cultivarName: row['CULTIVAR NAME'] || null,
          errors: validationErrors.join("; "),
          ...row
        });
        continue;
      }

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
        color: row['Color'] || row['E color'] || null,
        weight: parseFloat(row['Weight'] || row['E quant (Quantity)']) || null
      };
      const { insertedId: attrId } = await attrCol.insertOne(attributes);

      // Origin
      const origin = {
        country: row['E Origin Country'] || null,
        province: row['E Origin Province'] || null,
        city: row['E Origin City'] || null
      };
      const { insertedId: originId } = await originCol.insertOne(origin);

      //  Apple
      const apple = {
        acno: row['ACNO'] || null,
        accession: row['ACCESSION'],
        cultivarName: row['CULTIVAR NAME'],
        harvestDate: row['E Date Collected'] ? new Date(row['E Date Collected']) : null,
        tasteNotes: row['cmt (Inventory Comment)'] || null,
        notes: row['sitecmt (Site comment)'] || null,
        createdAt: new Date(),
        updatedAt: new Date(),
        appleProfileId: profileId,
        physicalAttributesId: attrId,
        originId: originId,
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
