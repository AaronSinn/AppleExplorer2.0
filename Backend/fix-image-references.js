const mongoose = require('mongoose');
require('dotenv').config();

const Apple = require('./models/Apple');

async function fixImageReferences() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });

        // Get all files from GridFS
        const gridfsFiles = await bucket.find({}).toArray();
        console.log(`Found ${gridfsFiles.length} files in GridFS`);

        // Create a map of accession numbers to image IDs
        const accessionToImageId = {};
        
        gridfsFiles.forEach(file => {
            // Extract accession number from filename using regex
            // Look for patterns like MAL0101, MAL0102, etc.
            const match = file.filename.match(/MAL(\d+)/i);
            if (match) {
                const accessionNumber = `MAL${match[1]}`;
                // Use the first image found for each accession (prefer non-cross-section images)
                if (!accessionToImageId[accessionNumber] || 
                    (!file.filename.toLowerCase().includes('cross') && 
                     accessionToImageId[accessionNumber].filename.toLowerCase().includes('cross'))) {
                    accessionToImageId[accessionNumber] = {
                        id: file._id,
                        filename: file.filename
                    };
                    console.log(`Mapped ${accessionNumber} -> ${file.filename} (${file._id})`);
                }
            }
        });

        console.log(`\nFound ${Object.keys(accessionToImageId).length} unique accession mappings`);

        // Update Apple documents with matching accession numbers
        let updateCount = 0;
        for (const [accession, imageInfo] of Object.entries(accessionToImageId)) {
            const result = await Apple.updateMany(
                { accession: accession },
                { $set: { imageId: imageInfo.id } }
            );
            if (result.modifiedCount > 0) {
                console.log(`Updated ${result.modifiedCount} apple(s) with accession ${accession} to use imageId ${imageInfo.id} (${imageInfo.filename})`);
                updateCount += result.modifiedCount;
            }
        }

        console.log(`\nSuccessfully updated ${updateCount} apple records with image references`);
        await mongoose.connection.close();

    } catch (error) {
        console.error('Error fixing image references:', error);
    }
}

fixImageReferences();
