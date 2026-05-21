const bcrypt = require("bcrypt");

const BUILTIN_ADMIN_USERNAME = (process.env.BUILTIN_ADMIN_USERNAME || "rif047").trim().toLowerCase();
const BUILTIN_ADMIN_PASSWORD_HASH = process.env.BUILTIN_ADMIN_PASSWORD_HASH || "$2b$10$NgLCTOfHvUpNuWUrsal.aOO.8lk4N3FLlAHd/ehueXyIFG5o7lpP.";
const BUILTIN_ADMIN_NAME = (process.env.BUILTIN_ADMIN_NAME || "Super Admin").trim();
const BUILTIN_ADMIN_PHONE = Number(process.env.BUILTIN_ADMIN_PHONE || 1700000000);
const BUILTIN_ADMIN_EMAIL = (process.env.BUILTIN_ADMIN_EMAIL || "rif047@local.system").trim().toLowerCase();
const BUILTIN_ADMIN_DESIGNATION = (process.env.BUILTIN_ADMIN_DESIGNATION || "System Administrator").trim();
const BUILTIN_ADMIN_ID = (process.env.BUILTIN_ADMIN_ID || "builtin-admin").trim();
const NODE_ENV = process.env.NODE_ENV || "development";

if (NODE_ENV === "production") {
    if (!process.env.BUILTIN_ADMIN_PASSWORD_HASH) {
        throw new Error("BUILTIN_ADMIN_PASSWORD_HASH is required in production.");
    }
    if (!process.env.BUILTIN_ADMIN_USERNAME) {
        throw new Error("BUILTIN_ADMIN_USERNAME is required in production.");
    }
}

const BUILTIN_ADMIN_USER = {
    _id: BUILTIN_ADMIN_ID,
    id: BUILTIN_ADMIN_ID,
    username: BUILTIN_ADMIN_USERNAME,
    userType: "Admin",
    name: BUILTIN_ADMIN_NAME,
    phone: BUILTIN_ADMIN_PHONE,
    email: BUILTIN_ADMIN_EMAIL,
    designation: BUILTIN_ADMIN_DESIGNATION,
    isSystemUser: true
};

const isReservedUsername = (username = "") => String(username).trim().toLowerCase() === BUILTIN_ADMIN_USERNAME;

const authenticateBuiltinAdmin = async ({ username = "", password = "" }) => {
    if (!isReservedUsername(username) || !password) return null;
    const isValid = await bcrypt.compare(password, BUILTIN_ADMIN_PASSWORD_HASH);
    return isValid ? BUILTIN_ADMIN_USER : null;
};

module.exports = {
    BUILTIN_ADMIN_USER,
    BUILTIN_ADMIN_USERNAME,
    authenticateBuiltinAdmin,
    isReservedUsername
};
