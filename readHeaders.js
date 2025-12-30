const xlsx = require("xlsx");

// Load the Excel file
const workbook = xlsx.readFile("TDInventory.xlsx");
const sheetName = workbook.SheetNames[0];
const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

// Print column headers
console.log("📌 Column Headers:");
console.log(data[0]);
