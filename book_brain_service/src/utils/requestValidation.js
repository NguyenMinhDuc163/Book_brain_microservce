const parsePositiveInteger = (value) => {
    if (value === undefined || value === null || value === '') return null;
    if (!/^\d+$/.test(String(value).trim())) return null;

    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

const parsePagination = (query, defaults = {}) => {
    const defaultPage = defaults.page || 1;
    const defaultLimit = defaults.limit || 10;
    const maxLimit = defaults.maxLimit || 100;

    const page = parsePositiveInteger(query.page) || defaultPage;
    const requestedLimit = parsePositiveInteger(query.limit) || defaultLimit;

    return { page, limit: Math.min(requestedLimit, maxLimit) };
};

const parseTemporaryBoolean = (value, defaultValue = false) => {
    if (value === undefined || value === null || value === '') return defaultValue;
    if (typeof value === 'boolean') return value;

    const normalized = String(value).trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;

    const numeric = Number(normalized);
    if (Number.isFinite(numeric)) return numeric > 0;

    return defaultValue;
};

module.exports = { parsePositiveInteger, parsePagination, parseTemporaryBoolean };
