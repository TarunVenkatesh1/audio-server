const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

app.use(express.raw({ type: 'audio/wav', limit: '10mb' }));

app.post('/upload', (req, res) => {

    const filename = `audio_${Date.now()}.wav`;
    const filepath = path.join(__dirname, filename);

    fs.writeFileSync(filepath, req.body);

    console.log("Saved:", filename);

    res.send("Upload successful");
});

app.get('/', (req, res) => {
    res.send("Audio server running");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server started"));
