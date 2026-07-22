const isPlainObject = (value) => (
    value !== null
    && typeof value === 'object'
    && !Array.isArray(value)
    && Object.prototype.toString.call(value) === '[object Object]'
);

const sanitizeValue = (value) => {
    if (Array.isArray(value)) {
        return value.map(sanitizeValue);
    }

    if (!isPlainObject(value)) return value;

    const clean = {};
    for (const [key, nested] of Object.entries(value)) {
        // Block MongoDB operator and dotted key injection patterns.
        if (key.startsWith('$') || key.includes('.')) continue;
        clean[key] = sanitizeValue(nested);
    }
    return clean;
};

const sanitizeRequest = (req, _res, next) => {
    if (req.body && typeof req.body === 'object') req.body = sanitizeValue(req.body);
    if (req.query && typeof req.query === 'object') req.query = sanitizeValue(req.query);
    if (req.params && typeof req.params === 'object') req.params = sanitizeValue(req.params);
    next();
};

module.exports = sanitizeRequest;
