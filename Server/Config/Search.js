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

            try {
                const collection = mongoose.connection.db.collection(coll.name);
                const sampleDocs = await collection.find({}).limit(1).toArray();
                if (sampleDocs.length === 0) continue;

                const sampleKeys = Object.keys(flattenObject(sampleDocs[0]))
                    .filter(key => !key.endsWith("_id"));

                const orConditions = sampleKeys.map((key) => ({
                    $expr: {
                        $regexMatch: {
                            input: { $toString: `$${key}` },
                            regex: q,
                            options: "i",
                        },
                    },
                }));

                let docs = await collection
                    .find({ $or: orConditions })
                    .limit(10)
                    .toArray();

                if (docs.length > 0) {
                    const clientIds = docs
                        .map(doc => doc.client)
                        .filter(id => id && mongoose.Types.ObjectId.isValid(id))
                        .map(id => new mongoose.Types.ObjectId(id));

                    let clientMap = {};
                    if (clientIds.length > 0) {
                        try {
                            const clients = await mongoose.connection.db
                                .collection("clients")
                                .find({ _id: { $in: clientIds } })
                                .toArray();

                            clientMap = clients.reduce((map, client) => {
                                const { _id, __v, createdAt, updatedAt, ...cleanClient } = client;
                                map[_id.toString()] = cleanClient;
                                return map;
                            }, {});
                        } catch (clientError) {
                            console.error(`Client fetch error for ${coll.name}:`, clientError);
                        }
                    }

                    docs = docs.map(doc => {
                        const { _id, updatedAt, __v, ...rest } = doc;

                        if (rest.client && mongoose.Types.ObjectId.isValid(rest.client)) {
                            const clientId = rest.client.toString();
                            rest.client = clientMap[clientId] || rest.client;
                        }

                        return rest;
                    });

                    allResults.push({
                        collection: coll.name,
                        results: docs,
                    });
                }
            } catch (collError) {
                console.error(`Error processing collection ${coll.name}:`, collError);
                continue;
            }
        }

        res.status(200).json(allResults);
    } catch (err) {
        console.error("Dynamic Search Error:", err);
        res.status(500).json({ error: "Internal server error", message: err.message });
    }
});

function flattenObject(obj, parent = "", res = {}) {
    for (let key in obj) {
        if (obj.hasOwnProperty(key)) {
            if (typeof obj[key] === "object" && obj[key] !== null && !Array.isArray(obj[key])) {
                flattenObject(obj[key], `${parent}${key}.`, res);
            } else {
                res[parent + key] = obj[key];
            }
        }
    }
    return res;
}

module.exports = router;