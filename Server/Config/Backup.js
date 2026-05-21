const express = require("express");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const multer = require("multer");
const mongoose = require("mongoose");
const { EJSON, ObjectId } = require("bson");
const cron = require("node-cron");

const router = express.Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const lowerName = String(file.originalname || "").toLowerCase();
        if (lowerName.endsWith(".gz") || lowerName.endsWith(".json")) return cb(null, true);
        cb(new Error("Only .gz or .json backup files are allowed"));
    },
});

const BACKUP_DIR = path.join(__dirname, "../backups");
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR);

const resolveBackupFilePath = (inputName) => {
    const safeName = path.basename(String(inputName || ""));
    if (!/^backup_\d+\.json\.gz$/.test(safeName)) {
        return null;
    }
    return path.join(BACKUP_DIR, safeName);
};


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

function parseBackupBuffer(buffer) {
    let raw = "";
    try {
        raw = zlib.gunzipSync(buffer).toString();
    } catch {
        raw = buffer.toString();
    }

    const parsed = EJSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Invalid backup format");
    }

    for (const [name, docs] of Object.entries(parsed)) {
        if (!Array.isArray(docs)) {
            throw new Error(`Invalid backup collection payload for "${name}"`);
        }
    }

    return parsed;
}

async function restoreDatabase(data) {
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            for (const [name, docsRaw] of Object.entries(data)) {
                const docs = docsRaw.map(toObjectIds);
                const col = mongoose.connection.db.collection(name);
                await col.deleteMany({}, { session });
                if (docs.length) await col.insertMany(docs, { session });
            }
        });
    } finally {
        await session.endSession();
    }
}

function getLatestBackupMtimeMs() {
    const files = fs.readdirSync(BACKUP_DIR)
        .filter((f) => f.endsWith(".json.gz"))
        .map((f) => fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs)
        .filter((t) => Number.isFinite(t));
    if (!files.length) return 0;
    return Math.max(...files);
}


async function createBackupFile() {
    const collections = await mongoose.connection.db.listCollections().toArray();
    const data = {};

    for (let c of collections) {
        data[c.name] = await mongoose.connection.db.collection(c.name).find({}).toArray();
    }

    const compressed = zlib.gzipSync(Buffer.from(EJSON.stringify(data)));
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
    const filePath = resolveBackupFilePath(req.params.file);
    if (!filePath) {
        return res.status(400).json({ message: "Invalid file name" });
    }
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
    }
    res.download(filePath);
});


router.delete("/backups/:file", (req, res) => {
    const filePath = resolveBackupFilePath(req.params.file);
    if (!filePath) {
        return res.status(400).json({ message: "Invalid file name" });
    }

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

        const data = parseBackupBuffer(req.file.buffer);
        await restoreDatabase(data);

        res.json({ message: "Database restored from uploaded file" });
    } catch (err) {
        console.error("Restore failed:", err);
        res.status(500).json({ message: "Restore failed", error: err.message });
    }
});


router.post("/restore-from-file/:file", async (req, res) => {
    try {
        const filePath = resolveBackupFilePath(req.params.file);
        if (!filePath) {
            return res.status(400).json({ message: "Invalid file name" });
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: "File not found" });
        }

        const buffer = fs.readFileSync(filePath);
        const data = parseBackupBuffer(buffer);
        await restoreDatabase(data);

        res.json({ message: "Database restored from server backup file" });
    } catch (err) {
        console.error("Restore failed:", err);
        res.status(500).json({ message: "Restore failed", error: err.message });
    }
});


cron.schedule("0 0 * * *", async () => {
    try {
        const latestBackupMs = getLatestBackupMtimeMs();
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        if (latestBackupMs && Date.now() - latestBackupMs < sevenDaysMs) return;

        console.log("Auto-backup (cron) running after 7-day interval check...");
        await createBackupFile();
        console.log("Auto-backup done.");
    } catch (err) {
        console.error("Auto-backup failed:", err);
    }
});

module.exports = router;
