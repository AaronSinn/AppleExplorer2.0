const mongoose = require('mongoose');
require('dotenv').config();

async function checkGridFS() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        const db = mongoose.connection.db;
        const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });

        // List all files in GridFS
        const cursor = bucket.find({});
        const files = await cursor.toArray();
        console.log(`Found ${files.length} files in GridFS:`);
        
        files.forEach(file => {
            console.log(`- ID: ${file._id}, Filename: ${file.filename}, Size: ${file.length} bytes`);
        });

        // Check specific file
        const specificId = '68773f627cad3fa5da0ea986';
        console.log(`\nLooking for file with ID: ${specificId}`);
        
        try {
            const objectId = new mongoose.Types.ObjectId(specificId);
            const specificFiles = await bucket.find({ _id: objectId }).toArray();
            console.log('File found:', specificFiles.length > 0 ? 'YES' : 'NO');
            if (specificFiles.length > 0) {
                console.log('File details:', specificFiles[0]);
            }
        } catch (error) {
            console.log('Error finding specific file:', error.message);
        }

        await mongoose.connection.close();
    } catch (error) {
        console.error('Error:', error);
    }
}

checkGridFS();
