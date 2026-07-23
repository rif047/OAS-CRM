const fs = require('fs');
const path = require('path');
const unzip = require('zlib');
const Mongoose = require('mongoose');

const Client = require('../API/Client/Client_Model');

const DEFAULT_XLSX_PATH = '/home/rifath/Downloads/Existing client to export.xlsx';
const PHONE_MISSING_NOTE = 'Phone number not provided';
const ACCESS_COMPANY = 'MLP';

const args = new Set(process.argv.slice(2));
const applyImport = args.has('--apply');
const xlsxPathArg = process.argv.find((arg) => arg.startsWith('--file='));
const xlsxPath = xlsxPathArg ? xlsxPathArg.slice('--file='.length) : DEFAULT_XLSX_PATH;

const xmlEscapeMap = {
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&apos;': "'",
};

function unzipEntry(buffer, offset) {
    const compression = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const dataStart = offset + 30 + fileNameLength + extraLength;
    const data = buffer.subarray(dataStart, dataStart + compressedSize);

    if (compression === 0) return data;
    if (compression === 8) return unzip.inflateRawSync(data);
    throw new Error(`Unsupported xlsx compression method: ${compression}`);
}

function readZipEntries(filePath) {
    const buffer = fs.readFileSync(filePath);
    const entries = new Map();
    let offset = 0;

    while (offset < buffer.length - 4) {
        const signature = buffer.readUInt32LE(offset);
        if (signature !== 0x04034b50) {
            offset += 1;
            continue;
        }

        const compressedSize = buffer.readUInt32LE(offset + 18);
        const fileNameLength = buffer.readUInt16LE(offset + 26);
        const extraLength = buffer.readUInt16LE(offset + 28);
        const fileName = buffer.subarray(offset + 30, offset + 30 + fileNameLength).toString();
        const content = unzipEntry(buffer, offset).toString('utf8');
        entries.set(fileName, content);

        offset += 30 + fileNameLength + extraLength + compressedSize;
    }

    return entries;
}

function decodeXml(value) {
    return String(value || '')
        .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(parseInt(decimal, 10)))
        .replace(/&(lt|gt|amp|quot|apos);/g, (match) => xmlEscapeMap[match] || match);
}

function columnIndex(cellRef) {
    const letters = String(cellRef || '').replace(/[^A-Za-z]/g, '');
    let index = 0;
    for (const letter of letters) {
        index = index * 26 + letter.toUpperCase().charCodeAt(0) - 64;
    }
    return index - 1;
}

function parseSharedStrings(xml) {
    if (!xml) return [];
    const strings = [];
    const siMatches = xml.match(/<si[\s\S]*?<\/si>/g) || [];

    for (const si of siMatches) {
        const textMatches = [...si.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)];
        strings.push(textMatches.map((match) => decodeXml(match[1])).join(''));
    }

    return strings;
}

function parseRows(entries) {
    const sharedStrings = parseSharedStrings(entries.get('xl/sharedStrings.xml'));
    const sheetXml = entries.get('xl/worksheets/sheet1.xml');
    if (!sheetXml) throw new Error('Could not find Sheet1 in xlsx file.');

    const rowMatches = sheetXml.match(/<row[\s\S]*?<\/row>/g) || [];
    return rowMatches.map((rowXml) => {
        const cells = [];
        const cellMatches = [...rowXml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)];

        for (const match of cellMatches) {
            const attrs = match[1];
            const body = match[2] || '';
            const ref = /r="([^"]+)"/.exec(attrs)?.[1] || '';
            const type = /t="([^"]+)"/.exec(attrs)?.[1] || '';
            const value = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1] || '';
            const index = columnIndex(ref);

            if (index < 0) continue;

            let cellValue = '';
            if (type === 's') {
                cellValue = sharedStrings[Number(value)] || '';
            } else if (type === 'inlineStr') {
                const texts = [...body.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)];
                cellValue = texts.map((textMatch) => decodeXml(textMatch[1])).join('');
            } else {
                cellValue = decodeXml(value);
            }

            cells[index] = normalizeText(cellValue);
        }

        return cells.map((value) => value || '');
    });
}

function normalizeText(value) {
    const text = String(value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    return text.replace(/[ \t]+/g, ' ');
}

function normalizeEmail(value) {
    const email = normalizeText(value).toLowerCase();
    if (!email) return { value: undefined };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { value: undefined, invalid: email };
    }
    return { value: email };
}

function cleanPhoneDigits(rawDigits) {
    let digits = String(rawDigits || '').replace(/\D/g, '');
    if (!digits) return '';

    if (digits.startsWith('0044')) digits = `44${digits.slice(4)}`;
    if (digits.startsWith('440')) digits = `44${digits.slice(3)}`;

    if (digits.length === 10 && /^[127]/.test(digits)) {
        return `0${digits}`;
    }

    return digits;
}

function splitPhones(value) {
    const raw = normalizeText(value);
    if (!raw) return [];

    const normalized = raw
        .replace(/\b(?:tel|telephone|mobile|mob|office|phone|m|o|t)\s*[:.]?/gi, '\n')
        .replace(/\bor\b/gi, '\n')
        .replace(/\band\b/gi, '\n');

    const pieces = normalized
        .split(/[\n,;/|]+|\s{2,}/)
        .map((piece) => cleanPhoneDigits(piece))
        .filter(Boolean);

    return [...new Set(pieces)];
}

function scoreUkPhone(phone) {
    if (phone.startsWith('07')) return 50;
    if (phone.startsWith('44')) return 40;
    if (phone.startsWith('02') || phone.startsWith('01') || phone.startsWith('03')) return 30;
    if (phone.startsWith('08')) return 20;
    if (phone.startsWith('0')) return 10;
    return 0;
}

function choosePhones(rawPhone) {
    const phones = splitPhones(rawPhone);
    if (phones.length <= 1) return { phone: phones[0], alt_phone: undefined, allPhones: phones };

    const sorted = [...phones].sort((a, b) => scoreUkPhone(b) - scoreUkPhone(a));
    return { phone: sorted[0], alt_phone: sorted[1], allPhones: sorted };
}

function appendMissingPhoneNote(description) {
    const normalized = normalizeText(description);
    if (!normalized) return PHONE_MISSING_NOTE;
    if (normalized.toLowerCase().includes(PHONE_MISSING_NOTE.toLowerCase())) return normalized;
    return `${normalized}\n${PHONE_MISSING_NOTE}`;
}

function prepareRows(rows) {
    const [header, ...dataRows] = rows;
    const records = [];
    const invalidEmails = [];
    const skipped = [];

    dataRows.forEach((row, index) => {
        const rowNumber = index + 2;
        const nameFromSheet = normalizeText(row[0]);
        const descriptionFromSheet = normalizeText(row[1]);
        const company = normalizeText(row[2]);
        const phoneCell = normalizeText(row[3]);
        const emailResult = normalizeEmail(row[4]);
        const phones = choosePhones(phoneCell);
        const name = nameFromSheet || phones.phone;

        if (emailResult.invalid) {
            invalidEmails.push({ row: rowNumber, email: emailResult.invalid });
        }

        if (!name) {
            skipped.push({ row: rowNumber, reason: 'blank name and blank phone' });
            return;
        }

        const doc = {
            name,
            company: company || undefined,
            phone: phones.phone || undefined,
            alt_phone: phones.alt_phone || undefined,
            email: emailResult.value,
            description: phones.phone ? descriptionFromSheet || undefined : appendMissingPhoneNote(descriptionFromSheet),
            access_company: ACCESS_COMPANY,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        Object.keys(doc).forEach((key) => doc[key] === undefined && delete doc[key]);
        records.push({ row: rowNumber, doc, allPhones: phones.allPhones });
    });

    return { header, records, invalidEmails, skipped };
}

function signature(doc) {
    return [
        doc.name || '',
        doc.company || '',
        doc.phone || '',
        doc.alt_phone || '',
        doc.email || '',
    ].join('|').toLowerCase();
}

async function filterDuplicates(records) {
    const existing = await Client.find({}, { phone: 1, email: 1, name: 1, company: 1, alt_phone: 1 }).lean();
    const existingPhones = new Set(existing.map((doc) => doc.phone).filter(Boolean));
    const existingEmails = new Set(existing.map((doc) => doc.email).filter(Boolean));
    const existingSignatures = new Set(existing.map(signature));

    const seenPhones = new Set();
    const seenEmails = new Set();
    const seenSignatures = new Set();
    const importable = [];
    const duplicates = [];

    for (const record of records) {
        const { doc, row } = record;
        const duplicateReasons = [];
        const docSignature = signature(doc);

        if (doc.phone && (existingPhones.has(doc.phone) || seenPhones.has(doc.phone))) {
            duplicateReasons.push(`phone ${doc.phone}`);
        }
        if (doc.email && (existingEmails.has(doc.email) || seenEmails.has(doc.email))) {
            duplicateReasons.push(`email ${doc.email}`);
        }
        if (existingSignatures.has(docSignature) || seenSignatures.has(docSignature)) {
            duplicateReasons.push('same client fields');
        }

        if (duplicateReasons.length) {
            duplicates.push({ row, name: doc.name, reasons: duplicateReasons });
            continue;
        }

        if (doc.phone) seenPhones.add(doc.phone);
        if (doc.email) seenEmails.add(doc.email);
        seenSignatures.add(docSignature);
        importable.push(record);
    }

    return { importable, duplicates, existingCount: existing.length };
}

async function main() {
    if (!process.env.MONGO_URI) {
        throw new Error('MONGO_URI is required.');
    }

    if (!fs.existsSync(xlsxPath)) {
        throw new Error(`Xlsx file not found: ${xlsxPath}`);
    }

    const entries = readZipEntries(path.resolve(xlsxPath));
    const rows = parseRows(entries);
    const { records, invalidEmails, skipped } = prepareRows(rows);

    await Mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
    });

    const { importable, duplicates, existingCount } = await filterDuplicates(records);

    console.log(JSON.stringify({
        mode: applyImport ? 'apply' : 'dry-run',
        fileRows: rows.length - 1,
        preparedRows: records.length,
        existingClientsInDb: existingCount,
        invalidEmails: invalidEmails.length,
        skippedRows: skipped.length,
        duplicateRows: duplicates.length,
        readyToInsert: importable.length,
        skipped,
        invalidEmails,
        duplicateSamples: duplicates.slice(0, 30),
    }, null, 2));

    if (applyImport && importable.length) {
        const docs = importable.map((record) => record.doc);
        const result = await Client.collection.insertMany(docs, { ordered: false });
        console.log(`Inserted ${result.insertedCount} clients.`);
    } else if (!applyImport) {
        console.log('Dry-run only. Re-run with --apply to insert.');
    }

    await Mongoose.disconnect();
}

main().catch(async (error) => {
    console.error(error);
    try {
        await Mongoose.disconnect();
    } catch (_) {
        // Ignore disconnect errors while handling the original failure.
    }
    process.exit(1);
});
