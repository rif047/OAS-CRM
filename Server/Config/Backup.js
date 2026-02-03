const express = require("express");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const multer = require("multer");
const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");
const cron = require("node-cron");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const BACKUP_DIR = path.join(__dirname, "../backups");
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);


function toObjectIds(obj) {
    if (Array.isArray(obj)) return obj.map(toObjectIds);
    if (obj && typeof obj === "object") {
        for (let k in obj) {
            const v = obj[k];
            if (typeof v === "string" && ObjectId.isValid(v) &&
                (k === "_id" || k.toLowerCase().endsWith("id"))) {
                obj[k] = new ObjectId(v);
            } else if (typeof v === "object" && v !== null) {
                obj[k] = toObjectIds(v);
            }
        }
    }
    return obj;
}


async function createBackupFile() {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const data = {};

    for (let c of collections) {
        data[c.name] = await mongoose.connection.db.collection(c.name).find({}).toArray();
    }

    const compressed = zlib.gzipSync(Buffer.from(JSON.stringify(data)));
    const fileName = `backup_${Date.now()}.json.gz`;
    const filePath = path.join(BACKUP_DIR, fileName);


    const files = fs.readdirSync(BACKUP_DIR)
        .filter(f => f.endsWith(".json.gz"))
        .map(f => ({
            name: f,
            time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs
        }))
        .sort((a, b) => a.time - b.time);

    while (files.length >= 10) {
        const oldest = files.shift();
        try {
            fs.unlinkSync(path.join(BACKUP_DIR, oldest.name));
            console.log("Deleted old backup:", oldest.name);
        } catch (err) {
            console.error("Failed to delete old backup:", oldest.name, err);
        }
    }

    fs.writeFileSync(filePath, compressed);
    return fileName;
}




router.post("/backup", async (req, res) => {
    try {
        const fileName = await createBackupFile();
        res.json({ message: "Backup created", fileName });
    } catch (err) {
        console.error("Backup error:", err);
        res.status(500).json({ message: "Backup failed", error: err.message });
    }
});


router.get("/backups", (req, res) => {
    try {
        if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

        const files = fs.readdirSync(BACKUP_DIR)
            .filter(f => f.endsWith(".json.gz"))
            .map(f => {
                const fullPath = path.join(BACKUP_DIR, f);
                const stats = fs.statSync(fullPath);
                return {
                    name: f,
                    size: stats.size,
                    date: stats.birthtime,
                };
            })
            .sort((a, b) => b.date - a.date);

        res.json(files);
    } catch (err) {
        console.error("Failed to fetch backups:", err);
        res.status(500).json({ message: "Failed to fetch backups", error: err.message });
    }
});


router.get("/backups/:file", (req, res) => {
    const file = req.params.file;
    const filePath = path.join(BACKUP_DIR, file);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
    }
    res.download(filePath);
});


router.delete("/backups/:file", (req, res) => {
    const file = req.params.file;
    const filePath = path.join(BACKUP_DIR, file);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
    }

    try {
        fs.unlinkSync(filePath);
        res.json({ message: "Backup deleted" });
    } catch (err) {
        console.error("Delete failed:", err);
        res.status(500).json({ message: "Delete failed", error: err.message });
    }
});


router.post("/restore", upload.single("backupFile"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });

        const raw = zlib.gunzipSync(req.file.buffer).toString();
        const data = JSON.parse(raw);

        for (let name in data) {
            const docs = data[name].map(toObjectIds);
            const col = mongoose.connection.db.collection(name);
            await col.deleteMany({});
            if (docs.length) await col.insertMany(docs);
        }

        res.json({ message: "Database restored from uploaded file" });
    } catch (err) {
        console.error("Restore failed:", err);
        res.status(500).json({ message: "Restore failed", error: err.message });
    }
});


router.post("/restore-from-file/:file", async (req, res) => {
    try {
        const file = req.params.file;
        const filePath = path.join(BACKUP_DIR, file);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: "File not found" });
        }

        const buffer = fs.readFileSync(filePath);
        const raw = zlib.gunzipSync(buffer).toString();
        const data = JSON.parse(raw);

        for (let name in data) {
            const docs = data[name].map(toObjectIds);
            const col = mongoose.connection.db.collection(name);
            await col.deleteMany({});
            if (docs.length) await col.insertMany(docs);
        }

        res.json({ message: "Database restored from server backup file" });
    } catch (err) {
        console.error("Restore failed:", err);
        res.status(500).json({ message: "Restore failed", error: err.message });
    }
});


cron.schedule("0 0 */7 * *", async () => {
    try {
        console.log("Auto-backup (cron) running...");
        await createBackupFile();
        console.log("Auto-backup done.");
    } catch (err) {
        console.error("Auto-backup failed:", err);
    }
});

module.exports = router;
