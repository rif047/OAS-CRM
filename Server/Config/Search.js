const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

router.get("/", async (req, res) => {
    const q = req.query.query?.trim();
    if (!q) return res.json([]);

    try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        let allResults = [];

        for (const coll of collections) {
            const collectionName = coll.name.toLowerCase();
            if (collectionName.includes("user")) continue;

            const collection = mongoose.connection.db.collection(coll.name);
            const sampleDocs = await collection.find({}).limit(1).toArray();
            if (sampleDocs.length === 0) continue;

            const sampleKeys = Object.keys(flattenObject(sampleDocs[0]));

            const orConditions = sampleKeys.map((key) => ({
                $expr: {
                    $regexMatch: {
                        input: { $toString: `$${key}` },
                        regex: q,
                        options: "i",
                    },
                },
            }));

            const docs = await collection
                .find({ $or: orConditions })
                .project({ _id: 0, createdAt: 0, __v: 0 })
                .limit(10)
                .toArray();

            if (docs.length > 0) {
                allResults.push({
                    collection: coll.name,
                    results: docs,
                });
            }
        }

        res.status(200).json(allResults);
    } catch (err) {
        console.error("Dynamic Search Error:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

function flattenObject(obj, parent = "", res = {}) {
    for (let key in obj) {
        if (typeof obj[key] === "object" && obj[key] !== null) {
            flattenObject(obj[key], `${parent}${key}.`, res);
        } else {
            res[parent + key] = obj[key];
        }
    }
    return res;
}

module.exports = router;
