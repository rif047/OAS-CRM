import axios from "axios";
import { toast } from "react-toastify";

const MUTATING_METHODS = new Set(["post", "put", "patch", "delete"]);
const SAFE_RETRY_METHODS = new Set(["get", "head", "options"]);
const RETRY_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const NETWORK_TOAST_ID = "network-offline";
const SESSION_TOAST_ID = "session-expired";
const CONFLICT_TOAST_ID = "data-conflict";

const inFlightMutations = new Map();
let isInitialized = false;
let isRedirectingToLogin = false;
let onlineListenersAttached = false;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const stableStringify = (value) => {
    if (value === null || value === undefined) return "";
    if (typeof value !== "object") return String(value);

    if (typeof FormData !== "undefined" && value instanceof FormData) {
        const pairs = [];
        for (const [key, item] of value.entries()) {
            if (item && typeof item === "object" && "name" in item) {
                pairs.push(`${key}:${item.name}:${item.size || ""}`);
            } else {
                pairs.push(`${key}:${String(item)}`);
            }
        }
        return `formdata(${pairs.sort().join("|")})`;
    }

    if (value instanceof Date) return value.toISOString();

    if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(",")}]`;
    }

    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${key}:${stableStringify(value[key])}`).join(",")}}`;
};

const buildMutationKey = (config) => {
    const method = String(config?.method || "get").toLowerCase();
    const url = String(config?.url || "");
    const params = stableStringify(config?.params || {});
    const data = stableStringify(config?.data || {});
    return `${method}|${url}|${params}|${data}`;
};

const isNetworkError = (error) => {
    if (!error) return false;
    if (error.code === "ERR_NETWORK") return true;
    if (error.code === "ECONNABORTED") return true;
    if (error.message === "Network Error") return true;
    return !error.response;
};

const getApiErrorMessage = (error) => {
    if (axios.isCancel(error)) return "Request cancelled.";

    const status = error?.response?.status;
    const payload = error?.response?.data;

    if (status === 409) {
        return typeof payload === "string"
            ? payload
            : payload?.error || "Data changed by another user. Please refresh and try again.";
    }

    if (status === 401) return "Session expired. Please login again.";
    if (status === 403) return "You do not have permission for this action.";
    if (status >= 500) return "Server is busy. Please try again shortly.";

    if (typeof payload === "string") return payload;
    if (payload?.error) return payload.error;
    if (payload?.message) return payload.message;

    if (isNetworkError(error)) {
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
            return "No internet connection. Please check your network.";
        }
        return "Network problem detected. Please try again.";
    }

    return error?.message || "Request failed.";
};

const ensureAuthHeader = (config) => {
    const token = localStorage.getItem("token");
    if (token && !config.headers?.Authorization) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
    }
};

const attachOnlineOfflineListeners = () => {
    if (onlineListenersAttached || typeof window === "undefined") return;
    onlineListenersAttached = true;

    window.addEventListener("offline", () => {
        if (!toast.isActive(NETWORK_TOAST_ID)) {
            toast.error("Internet disconnected. Requests will auto-retry when possible.", {
                toastId: NETWORK_TOAST_ID,
            });
        }
    });

    window.addEventListener("online", () => {
        toast.dismiss(NETWORK_TOAST_ID);
        toast.success("Internet connection restored.");
    });
};

const patchAxiosRequestForMutationDedupe = () => {
    const originalRequest = axios.request.bind(axios);
    if (axios.request.__isPatchedForDedupe) return;

    axios.request = function patchedRequest(configOrUrl, maybeConfig) {
        const normalizedConfig = typeof configOrUrl === "string"
            ? { ...(maybeConfig || {}), url: configOrUrl }
            : { ...(configOrUrl || {}) };

        const method = String(normalizedConfig.method || "get").toLowerCase();
        const shouldDedupe = MUTATING_METHODS.has(method) && !normalizedConfig.disableDedupe;

        if (!shouldDedupe) {
            return originalRequest(configOrUrl, maybeConfig);
        }

        const key = buildMutationKey(normalizedConfig);
        const existing = inFlightMutations.get(key);
        if (existing) return existing;

        const requestPromise = originalRequest(configOrUrl, maybeConfig).finally(() => {
            inFlightMutations.delete(key);
        });

        inFlightMutations.set(key, requestPromise);
        return requestPromise;
    };

    axios.request.__isPatchedForDedupe = true;
};

export const setupApiClient = () => {
    if (isInitialized) return;
    isInitialized = true;

    axios.defaults.timeout = 15000;
    axios.defaults.withCredentials = true;
    axios.defaults.headers.common.Accept = "application/json";

    patchAxiosRequestForMutationDedupe();
    attachOnlineOfflineListeners();

    axios.interceptors.request.use(
        (config) => {
            ensureAuthHeader(config);
            config.headers = config.headers || {};
            config.headers["X-Client-Request-At"] = new Date().toISOString();
            config.metadata = {
                ...(config.metadata || {}),
                retryCount: Number(config.metadata?.retryCount || 0),
            };
            return config;
        },
        (error) => Promise.reject(error)
    );

    axios.interceptors.response.use(
        (response) => response,
        async (error) => {
            const config = error?.config || {};
            const method = String(config?.method || "get").toLowerCase();
            const retryCount = Number(config?.metadata?.retryCount || 0);
            const status = error?.response?.status;
            const shouldRetry = SAFE_RETRY_METHODS.has(method)
                && retryCount < 2
                && (isNetworkError(error) || RETRY_STATUS_CODES.has(status));

            if (shouldRetry) {
                config.metadata = config.metadata || {};
                config.metadata.retryCount = retryCount + 1;
                await sleep(400 * config.metadata.retryCount);
                return axios(config);
            }

            if (status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("user");
                localStorage.removeItem("userType");

                if (!toast.isActive(SESSION_TOAST_ID)) {
                    toast.error("Session expired. Please login again.", { toastId: SESSION_TOAST_ID });
                }

                if (!isRedirectingToLogin && window.location.pathname !== "/login") {
                    isRedirectingToLogin = true;
                    setTimeout(() => {
                        window.location.href = "/login";
                    }, 150);
                }
            } else if (status === 409 && !toast.isActive(CONFLICT_TOAST_ID)) {
                toast.info("Another user updated this data. Please refresh and retry.", {
                    toastId: CONFLICT_TOAST_ID,
                });
            } else if (isNetworkError(error) && !toast.isActive(NETWORK_TOAST_ID)) {
                toast.error(getApiErrorMessage(error), { toastId: NETWORK_TOAST_ID });
            }

            error.userMessage = getApiErrorMessage(error);
            return Promise.reject(error);
        }
    );
};

export { getApiErrorMessage };
