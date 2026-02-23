const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(express.raw({ type: 'audio/wav', limit: '200mb' }));

const AUDIO_FOLDER = __dirname;
const MERGED_FILE = path.join(AUDIO_FOLDER, 'merged.wav');

// =======================================================
// UPLOAD + AUTO MERGE
// =======================================================
app.post('/upload', (req, res) => {

    if (!req.body || req.body.length <= 44) {
        return res.status(400).send("Invalid audio file");
    }

    const filename = `audio_${Date.now()}.wav`;
    const filepath = path.join(AUDIO_FOLDER, filename);

    // Save individual file
    fs.writeFileSync(filepath, req.body);
    console.log("Saved:", filename);

    const chunkData = req.body;
    const pcmData = chunkData.slice(44); // remove header

    // If merged.wav doesn't exist → create with first chunk
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

        const riffSize = totalSize - 8;
        const dataSize = totalSize - 44;

        let buffer = Buffer.alloc(4);

        // Update RIFF chunk size (offset 4)
        buffer.writeUInt32LE(riffSize, 0);
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
// COUNT FILES
// =======================================================
app.get('/count', (req, res) => {

    const files = fs.readdirSync(AUDIO_FOLDER)
        .filter(file => file.endsWith('.wav') && file !== 'merged.wav');

    res.json({
        totalIndividualFiles: files.length
    });
});

// =======================================================
// LIST INDIVIDUAL FILES
// =======================================================
app.get('/list', (req, res) => {

    const files = fs.readdirSync(AUDIO_FOLDER)
        .filter(file => file.endsWith('.wav') && file !== 'merged.wav');

    res.json(files);
});

// =======================================================
// DOWNLOAD INDIVIDUAL FILE
// =======================================================
app.get('/download/:filename', (req, res) => {

    const filePath = path.join(AUDIO_FOLDER, req.params.filename);

    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).send("File not found");
    }
});

// =======================================================
// DOWNLOAD MERGED FILE
// =======================================================
app.get('/download-merged', (req, res) => {

    if (fs.existsSync(MERGED_FILE)) {
        res.download(MERGED_FILE);
    } else {
        res.status(404).send("No merged file found");
    }
});

// =======================================================
// STATUS (OPTIONAL BUT USEFUL)
// =======================================================
app.get('/status', (req, res) => {

    const files = fs.readdirSync(AUDIO_FOLDER)
        .filter(file => file.endsWith('.wav') && file !== 'merged.wav');

    let mergedSize = 0;

    if (fs.existsSync(MERGED_FILE)) {
        mergedSize = fs.statSync(MERGED_FILE).size;
    }

    res.json({
        individualFiles: files.length,
        mergedSizeMB: (mergedSize / (1024 * 1024)).toFixed(2)
    });
});

// =======================================================
app.get('/', (req, res) => {
    res.send("Audio server running (Auto-Merge Enabled)");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server started"));
