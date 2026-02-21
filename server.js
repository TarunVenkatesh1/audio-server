const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(express.raw({ type: 'audio/wav', limit: '10mb' }));

// Upload endpoint
app.post('/upload', (req, res) => {

    const filename = `audio_${Date.now()}.wav`;
    const filepath = path.join(__dirname, filename);

    fs.writeFileSync(filepath, req.body);

    console.log("Saved:", filename);

    res.send("Upload successful");
});

// 🔥 NEW: List all files
app.get('/list', (req, res) => {

    const files = fs.readdirSync(__dirname)
        .filter(file => file.endsWith('.wav'));

    res.json(files);
});

// 🔥 NEW: Download file
app.get('/download/:filename', (req, res) => {

    const filePath = path.join(__dirname, req.params.filename);

    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).send("File not found");
    }
});

app.get('/', (req, res) => {
    res.send("Audio server running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server started"));
