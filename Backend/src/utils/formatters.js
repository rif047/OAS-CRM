export const LONDON_TIME_ZONE = "Europe/London";

const toDate = (value) => {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const formatCurrencyGBP = (value) => {
    const numeric = Number(String(value ?? 0).replace(/[^0-9.-]/g, ""));
    const amount = Number.isFinite(numeric) ? numeric : 0;
    return new Intl.NumberFormat("en-GB", {
        style: "currency",
        currency: "GBP",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    }).format(amount);
};

export const formatLondonDate = (value, fallback = "N/A") => {
    const date = toDate(value);
    if (!date) return fallback;
    return new Intl.DateTimeFormat("en-GB", {
        timeZone: LONDON_TIME_ZONE,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(date);
};

export const formatLondonDateShort = (value, fallback = "N/A") => {
    const date = toDate(value);
    if (!date) return fallback;
    return new Intl.DateTimeFormat("en-GB", {
        timeZone: LONDON_TIME_ZONE,
        day: "2-digit",
        month: "short",
        year: "numeric",
    }).format(date);
};

export const formatLondonDateTime = (value, fallback = "N/A") => {
    const date = toDate(value);
    if (!date) return fallback;
    return new Intl.DateTimeFormat("en-GB", {
        timeZone: LONDON_TIME_ZONE,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).format(date);
};

export const formatLondonInputDate = (value, fallback = "") => {
    const date = toDate(value);
    if (!date) return fallback;
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: LONDON_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
};
