const bcrypt = require("bcrypt");

const BUILTIN_ADMIN_USERNAME = (process.env.BUILTIN_ADMIN_USERNAME || "admin_cic").trim().toLowerCase();
const BUILTIN_ADMIN_PASSWORD_HASH = process.env.BUILTIN_ADMIN_PASSWORD_HASH || "$2b$10$XQa5.nejBhmRaeKv1IPvnunkebSJ6Gjwdu1TkG7yGjQk4OVi.JVpi";
const BUILTIN_ADMIN_NAME = (process.env.BUILTIN_ADMIN_NAME || "CIC Admin").trim();
const BUILTIN_ADMIN_PHONE = Number(process.env.BUILTIN_ADMIN_PHONE || 0);
const BUILTIN_ADMIN_EMAIL = (process.env.BUILTIN_ADMIN_EMAIL || "admin_cic@local.system").trim().toLowerCase();
const BUILTIN_ADMIN_DESIGNATION = (process.env.BUILTIN_ADMIN_DESIGNATION || "System Administrator").trim();
const BUILTIN_ADMIN_ID = (process.env.BUILTIN_ADMIN_ID || "builtin-admin").trim();

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
