const express = require("express");
const router = express.Router();
const Lead = require("../API/Lead/Lead_Model");
const Client = require("../API/Client/Client_Model");

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

router.get("/", async (req, res) => {
    const q = req.query.query?.trim();
    if (!q) return res.json([]);
    if (q.length > 80) return res.status(400).json({ error: "Query too long" });
    if (q.length < 2) return res.json([]);

    const containsRegex = new RegExp(escapeRegex(q), "i");

    try {
        const [clientRows, leadRows] = await Promise.all([
            Client.find({
                $or: [
                    { name: containsRegex },
                    { phone: containsRegex },
                    { email: containsRegex },
                    { company: containsRegex },
                ],
            })
                .select("name phone email company createdAt")
                .sort({ createdAt: -1, _id: -1 })
                .limit(10)
                .lean(),
            Lead.find({
                $or: [
                    { leadCode: containsRegex },
                    { company: containsRegex },
                    { status: containsRegex },
                    { stage: containsRegex },
                ],
            })
                .select("leadCode company status stage source address quote_price createdAt updatedAt client")
                .sort({ createdAt: -1, _id: -1 })
                .limit(10)
                .populate({ path: "client", select: "name phone email company", options: { lean: true } })
                .lean(),
        ]);

        const allResults = [];
        if (leadRows.length) {
            allResults.push({
                collection: "leads",
                results: leadRows,
            });
        }
        if (clientRows.length) {
            allResults.push({
                collection: "clients",
                results: clientRows,
            });
        }

        return res.status(200).json(allResults);
    } catch (err) {
        console.error("Dynamic Search Error:", err);
        res.status(500).json({ error: "Internal server error", message: err.message });
    }
});

module.exports = router;
