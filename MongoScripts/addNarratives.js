const xlsx = require("xlsx");
const { MongoClient, Double, ObjectId } = require("mongodb");

const uri = "mongodb://localhost:27017/AppleExplorer"; 
const client = new MongoClient(uri);

const workbook2013 = xlsx.readFile("../RawData/2013Database.xlsx");
const NarrativeWorkbook = xlsx.readFile("../RawData/Narrative.xlsx");

const insertedSet = new Set();

async function addShortFormNarratives(){
    var importedCount = 0;

    try {
        const sheetName = workbook2013.SheetNames[0]; //Narrative
        const rows = xlsx.utils.sheet_to_json(workbook2013.Sheets[sheetName]);

        // Connect to Database
        await client.connect();
        const db = client.db("AppleExplorer");
        const narrativesCol = db.collection("Narratives");

        for (const row of rows) {
            const narrative = {
                LocalNarrativeID: row['LOCAL NARRATIVE ID'],
                accession: row['HARROW ACCESSION'],
                narrative: row['Narrative']
            };

            // Prevents duplicate entires from being inserted
            if(!insertedSet.has(row['LOCAL NARRATIVE ID'])){
                await narrativesCol.insertOne(narrative);
                importedCount++;
            }
            insertedSet.add(row['LOCAL NARRATIVE ID']);
        }

        console.log(`Done. Added ${importedCount} short narratives.\n`);

    } catch (err) {
        console.error("Error updating Short narratives:", err);
    } finally {
        await client.close();
    }
}

async function addLongFormNarratives(){
    var importedCount = 0;

    try {
        const sheetName = NarrativeWorkbook.SheetNames[0]; //Narrative
        const rows = xlsx.utils.sheet_to_json(NarrativeWorkbook.Sheets[sheetName]);

        // Connect to Database
        await client.connect();
        const db = client.db("AppleExplorer");
        const narrativesCol = db.collection("Narratives");

        for (const row of rows) {
            const narrative = {
                LocalNarrativeID: row['LOCAL NARRATIVE ID'] || null,
                accession: row['HARROW ACCESSION'] || null,
                narrative: row['Narrative'] || null
            };

            // Prevents duplicate entires from being inserted
            if(!insertedSet.has(row['LOCAL NARRATIVE ID'])){
                await narrativesCol.insertOne(narrative);
                importedCount++;
            }
            insertedSet.add(row['LOCAL NARRATIVE ID']);
        }

        console.log(`Done. Added ${importedCount} long narratives.\n`);

    } catch (err) {
        console.error("Error updating Long narratives:", err);
    } finally {
        await client.close();
    }
}

async function run(){
    await addShortFormNarratives();
    await addLongFormNarratives();
}

run();
