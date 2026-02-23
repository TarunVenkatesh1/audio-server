const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(express.raw({ type: 'audio/wav', limit: '200mb' }));

const MERGED_FILE = path.join(__dirname, 'merged.wav');

// =======================================================
// UPLOAD + AUTO MERGE
// =======================================================
app.post('/upload', (req, res) => {

    if (!req.body || req.body.length <= 44) {
        return res.status(400).send("Invalid audio file");
    }

    console.log("Received file size:", req.body.length);

    const chunkData = req.body;
    const pcmData = chunkData.slice(44);  // remove header

    // If merged file doesn't exist → create with first chunk
    if (!fs.existsSync(MERGED_FILE)) {

        fs.writeFileSync(MERGED_FILE, chunkData);
        console.log("Created merged.wav");

    } else {

        // Append only PCM data
        fs.appendFileSync(MERGED_FILE, pcmData);

        // Fix WAV header
        const stats = fs.statSync(MERGED_FILE);
        const totalSize = stats.size;

        const fd = fs.openSync(MERGED_FILE, 'r+');

        const fileSize = totalSize - 8;      // RIFF size
        const dataSize = totalSize - 44;     // PCM size

        let buffer = Buffer.alloc(4);

        // Update RIFF chunk size (offset 4)
        buffer.writeUInt32LE(fileSize, 0);
        fs.writeSync(fd, buffer, 0, 4, 4);

        // Update data chunk size (offset 40)
        buffer.writeUInt32LE(dataSize, 0);
        fs.writeSync(fd, buffer, 0, 4, 40);

        fs.closeSync(fd);

        console.log("Merged chunk. New size:", totalSize);
    }

    res.send("Upload & merge successful");
});

// =======================================================
// DOWNLOAD MERGED FILE
// =======================================================
app.get('/download', (req, res) => {

    if (fs.existsSync(MERGED_FILE)) {
        res.download(MERGED_FILE);
    } else {
        res.status(404).send("No merged file found");
    }
});

// =======================================================
// ROOT
// =======================================================
app.get('/', (req, res) => {
    res.send("Audio server running with auto-merge");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server started"));
