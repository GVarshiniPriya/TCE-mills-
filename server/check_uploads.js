const fs = require('fs');
const path = require('path');

const uploadDir = path.join(__dirname, 'uploads');

if (fs.existsSync(uploadDir)) {
    console.log("Uploads directory exists.");
    const files = fs.readdirSync(uploadDir);
    console.log("Files in uploads:", files);
} else {
    console.log("Uploads directory DOES NOT exist.");
}
