'use strict';

const cp = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const fileUpload = require('express-fileupload');
const app = express();

const indexHtml = fs.readFileSync('./index.html', 'utf-8');

app.use(fileUpload({
    limits: {
        fileSize: 0.1 * 1024 * 1024 // 100 KB
    },
    safeFileNames: true,
    abortOnLimit: true
}));

app.get('/', (req, res) => {
    res.send(indexHtml);
});

app.post('/upload', (req, res) => {
    if (!req.files || !req.files.archive) {
        res.status(400).send('No files were uploaded.');
        return;
    }

    const {md5, data} = req.files.archive;
    const archivePath = path.join(os.tmpdir(), `${md5}.zip`);
    const dataPath = path.join(os.tmpdir(), md5);

    if (!fs.existsSync(dataPath)) {
        fs.writeFileSync(archivePath, data);
        cp.execSync(`mkdir -p ${dataPath} && cd ${dataPath} && unzip ${archivePath}`);
    }

    res.redirect(`/browse?md5=${md5}`);
});

app.get('/browse', (req, res) => {
    if (!req.query.md5) {
        res.status(400).send('md5 required.');
        return;
    }

    if (!/^[a-f0-9]{32}$/.test(req.query.md5)) {
        res.status(400).send('Wrong md5.');
        return;
    }

    const md5 = req.query.md5;
    const dataPath = path.join(os.tmpdir(), md5);

    if (!fs.existsSync(dataPath)) {
        res.status(400).send('Bad archive.');
        return;
    }

    if (req.query.file) {
        const filePath = path.join(os.tmpdir(), md5, path.basename(req.query.file));

        if (fs.existsSync(filePath)) {
            res.send(fs.readFileSync(filePath, 'utf-8'));
            return;
        }
    }

    const files = fs.readdirSync(dataPath, {withFileTypes: true});

    let out = '<ul>';

    files.forEach((f) => {
        if (!f.isDirectory()) {
            out += `<li><a href="/browse?md5=${md5}&file=${encodeURIComponent(f.name)}">${f.name}</a></li>`;
        }
    });

    out += '</ul>';

    res.send(out);
});

app.listen(8000);
