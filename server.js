const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(express.raw({ type: 'audio/wav', limit: '200mb' }));

const AUDIO_FOLDER = __dirname;

// =======================================================
// UPLOAD (Stores individual files only)
// =======================================================
app.post('/upload', (req, res) => {

    if (!req.body || req.body.length <= 44) {
        return res.status(400).send("Invalid audio file");
    }

    const filename = `audio_${Date.now()}.wav`;
    const filepath = path.join(AUDIO_FOLDER, filename);

    fs.writeFileSync(filepath, req.body);

    console.log("Saved:", filename);

    res.send("Upload successful");
});

// =======================================================
// COUNT
// =======================================================
app.get('/count', (req, res) => {

    const files = fs.readdirSync(AUDIO_FOLDER)
        .filter(file => file.endsWith('.wav'));

    res.json({ totalFiles: files.length });
});

// =======================================================
// LIST FILES
// =======================================================
app.get('/list', (req, res) => {

    const files = fs.readdirSync(AUDIO_FOLDER)
        .filter(file => file.endsWith('.wav'));

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
// MERGE AND DOWNLOAD
// =======================================================
app.get('/merge-download', (req, res) => {

    const files = fs.readdirSync(AUDIO_FOLDER)
        .filter(file => file.endsWith('.wav'))
        .sort();  // ensure order

    if (files.length < 1) {
        return res.status(400).send("No files to merge");
    }

    const mergedPath = path.join(AUDIO_FOLDER, 'merged_temp.wav');

    let writeStream = fs.createWriteStream(mergedPath);
    let totalDataSize = 0;

    files.forEach((file, index) => {

        const filePath = path.join(AUDIO_FOLDER, file);
        const data = fs.readFileSync(filePath);

        if (index === 0) {
            writeStream.write(data);
            totalDataSize += data.length - 44;
        } else {
            writeStream.write(data.slice(44));  // skip header
            totalDataSize += data.length - 44;
        }
    });

    writeStream.end();

    writeStream.on('finish', () => {

        const fd = fs.openSync(mergedPath, 'r+');

        const riffSize = totalDataSize + 36;
        const dataSize = totalDataSize;

        let buffer = Buffer.alloc(4);

        // Update RIFF size
        buffer.writeUInt32LE(riffSize, 0);
        fs.writeSync(fd, buffer, 0, 4, 4);

        // Update data chunk size
        buffer.writeUInt32LE(dataSize, 0);
        fs.writeSync(fd, buffer, 0, 4, 40);

        fs.closeSync(fd);

        res.download(mergedPath);
    });
});

// =======================================================
app.get('/', (req, res) => {
    res.send("Audio server running (Merge On Demand Enabled)");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server started"));
