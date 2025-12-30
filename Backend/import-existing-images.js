const mongoose = require('mongoose');
const { GridFSBucket } = require('mongodb');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Import models
const Apple = require('./models/Apple');

// Image data files
const appleData = require('../imageDB.applesupdated.json');
const fsFiles = require('../imageDB.fs.files.json');

let gfs;

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected');
        
        const conn = mongoose.connection;
        gfs = new GridFSBucket(conn.db, { bucketName: 'images' });
        console.log('GridFS initialized');
    } catch (error) {
        console.error('Database connection error:', error);
        process.exit(1);
    }
}

async function importExistingImages() {
    console.log('Starting image import process...');
    
    // Create a mapping from GridFS files to accession numbers
    const imageMapping = {};
    
    // Process fsFiles to create mapping
    for (const file of fsFiles) {
        const filename = file.filename;
        const imageId = file._id.$oid;
        
        // Extract the actual filename from the full path
        const actualFilename = path.basename(filename);
        console.log(`Processing file: ${actualFilename}`);
        
        // Try different patterns to match accession numbers
        // Pattern 1: MAL0101, AME0101, FRA0101, etc. (3 letters + 4 digits)
        let accessionMatch = actualFilename.match(/([A-Z]{3}\d{4})/);
        
        if (accessionMatch) {
            const accession = accessionMatch[1];
            if (!imageMapping[accession]) {
                imageMapping[accession] = [];
            }
            imageMapping[accession].push(imageId);
            console.log(`Mapped ${accession} -> ${imageId} (${actualFilename})`);
        } else {
            // Pattern 2: Try to match other patterns like Chenango_Strawberry
            // We'll try to match this with apple names later
            console.log(`No accession pattern found for: ${actualFilename}`);
        }
    }
    
    console.log(`Created ${Object.keys(imageMapping).length} image mappings`);
    
    // Update Apple records with imageIds where we have matches
    let updatedCount = 0;
    for (const apple of appleData) {
        const accession = apple.accession;
        if (accession && accession !== 'Empty' && imageMapping[accession]) {
            try {
                // Use the first image for each accession
                const imageId = imageMapping[accession][0];
                
                const result = await Apple.updateOne(
                    { accession: accession },
                    { 
                        $set: { 
                            imageId: new mongoose.Types.ObjectId(imageId)
                        }
                    }
                );
                
                if (result.modifiedCount > 0) {
                    console.log(`Updated ${accession} with imageId ${imageId}`);
                    updatedCount++;
                } else {
                    console.log(`No apple found with accession ${accession}`);
                }
            } catch (error) {
                console.error(`Error updating ${accession}:`, error.message);
            }
        }
    }
    
    console.log(`Successfully updated ${updatedCount} apple records with image references`);
}

async function main() {
    try {
        await connectDB();
        await importExistingImages();
        console.log('Image import completed successfully!');
    } catch (error) {
        console.error('Import failed:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Database connection closed');
        process.exit(0);
    }
}

main();
