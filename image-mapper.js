const fs = require('fs');
const path = require('path');

// Get all image files from PMP folder
const pmpFolder = path.join(__dirname, 'public/PMP');
const imageFiles = fs.readdirSync(pmpFolder).filter(file => 
  file.toLowerCase().endsWith('.jpg') || file.toLowerCase().endsWith('.png')
);

// Create mapping from accession codes to image filenames
const imageMapping = {};

imageFiles.forEach(filename => {
  // Extract accession code from filename - handle various patterns
  let accessionCode = null;
  
  // Pattern 1: Standard format like MAL0101, PRU0123, etc.
  let match = filename.match(/^([A-Z]{2,4}\d+)/i);
  if (match) {
    accessionCode = match[1].toUpperCase();
  } else {
    // Pattern 2: With underscore like MAL_0990
    match = filename.match(/^([A-Z]{2,4}_\d+)/i);
    if (match) {
      accessionCode = match[1].toUpperCase().replace('_', '');
    } else {
      // Pattern 3: Special names like "Chenango_Strawberry_076" or "Margil_157"
      match = filename.match(/^([A-Za-z_]+)_(\d+)/);
      if (match) {
        accessionCode = `${match[1].toUpperCase()}_${match[2]}`;
      }
    }
  }
  
  if (accessionCode) {
    // If multiple images for same accession, store as array
    if (!imageMapping[accessionCode]) {
      imageMapping[accessionCode] = [];
    }
    imageMapping[accessionCode].push(filename);
  } else {
    console.log(`Could not parse: ${filename}`);
  }
});

// Keep ALL images as arrays for each accession code
const finalMapping = {};
Object.entries(imageMapping).forEach(([accession, images]) => {
  if (Array.isArray(images)) {
    // Sort images to put main images first, then cross-sections
    const sortedImages = images.sort((a, b) => {
      const aIsCross = a.toLowerCase().includes('cross_section');
      const bIsCross = b.toLowerCase().includes('cross_section');
      if (aIsCross && !bIsCross) return 1;
      if (!aIsCross && bIsCross) return -1;
      return 0;
    });
    finalMapping[accession] = sortedImages;
  } else {
    finalMapping[accession] = [images];
  }
});

// Save mapping to JSON file
fs.writeFileSync('image-mapping.json', JSON.stringify(finalMapping, null, 2));

console.log(`Created mapping for ${Object.keys(finalMapping).length} apple varieties out of ${imageFiles.length} total files`);
console.log(`Total images mapped: ${Object.values(finalMapping).flat().length}`);
console.log('Sample mappings:');
console.log(Object.entries(finalMapping).slice(0, 3).map(([code, imgs]) => [code, imgs.length > 1 ? `${imgs[0]} +${imgs.length-1} more` : imgs[0]]));
