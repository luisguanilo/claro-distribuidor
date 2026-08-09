const xlsx = require('xlsx');

try {
    const workbook = xlsx.readFile('C:\\Users\\Luis Guanilo\\Documents\\Lista de Precios 01082026.xlsx');
    console.log("Sheet names:", workbook.SheetNames);
    
    // Check second sheet
    if (workbook.SheetNames.length > 1) {
        const sheetName = workbook.SheetNames[1];
        console.log(`\nReading sheet: ${sheetName}`);
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null });
        console.log("Total rows in sheet 2:", data.length);
        for (let i = 0; i < Math.min(20, data.length); i++) {
            console.log(`Row ${i + 1}:`, JSON.stringify(data[i]));
        }
    }
    
    // Check third sheet if exists
    if (workbook.SheetNames.length > 2) {
        const sheetName = workbook.SheetNames[2];
        console.log(`\nReading sheet: ${sheetName}`);
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: null });
        console.log("Total rows in sheet 3:", data.length);
        for (let i = 0; i < Math.min(10, data.length); i++) {
            console.log(`Row ${i + 1}:`, JSON.stringify(data[i]));
        }
    }

} catch (e) {
    console.error("Error reading file:", e.message);
}
