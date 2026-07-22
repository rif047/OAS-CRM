const handleControllerError = (res, error, fallbackMessage = 'Request failed.') => {
    if (error?.name === 'VersionError') {
        return res.status(409).send('This record was updated by another user. Refresh and try again.');
    }

    if (error?.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || 'field';
        return res.status(409).send(`${field} already exists. Use a different value.`);
    }

    return res.status(500).send(fallbackMessage);
};

module.exports = { handleControllerError };
