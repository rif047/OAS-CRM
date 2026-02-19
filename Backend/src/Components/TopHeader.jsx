import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { NavLink } from "react-router-dom";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import ListIcon from "@mui/icons-material/List";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import EastIcon from "@mui/icons-material/East";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SideMenu from "./SideMenu";

export default function TopHeader() {
    const userType = localStorage.getItem("userType");

    const [showMenu, setShowMenu] = useState(false);
    const [showLogout, setShowLogout] = useState(false);
    const [userName, setUserName] = useState("");
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [showResults, setShowResults] = useState(false);
    const [loading, setLoading] = useState(false);
    const [focused, setFocused] = useState(false);
    const [error, setError] = useState(null);

    const debounceTimer = useRef(null);
    const searchRef = useRef(null);
    const resultsRef = useRef(null);

    const pathName = window.location.pathname.split("/").slice(1, 3).join(" > ");

    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (userData) {
            try {
                const user = JSON.parse(userData);
                setUserName(user.name || user.username || "");
            } catch (err) {
                console.error("User data parse error:", err);
            }
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (
                resultsRef.current &&
                !resultsRef.current.contains(e.target) &&
                searchRef.current &&
                !searchRef.current.contains(e.target)
            ) {
                setShowResults(false);
            }
        };

        const handleEscape = (e) => {
            if (e.key === "Escape") {
                setShowResults(false);
                setQuery("");
            }
        };

        if (showResults) {
            document.addEventListener("mousedown", handleClickOutside);
            document.addEventListener("keydown", handleEscape);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, [showResults]);

    useEffect(() => {
        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("userType");
        window.location.href = "/";
    };

    const handleSearch = useCallback((e) => {
        const value = e.target.value;
        setQuery(value);
        setError(null);

        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }

        debounceTimer.current = setTimeout(async () => {
            if (!value.trim()) {
                setResults([]);
                setShowResults(false);
                return;
            }

            setLoading(true);
            try {
                const res = await axios.get(
                    `${import.meta.env.VITE_SERVER_URL}/search?query=${encodeURIComponent(value)}`,
                    { timeout: 10000 }
                );

                const mappedResults = res.data.map((group) => ({
                    ...group,
                    total: group.results.length,
                }));

                setResults(mappedResults);
                setShowResults(true);
            } catch (err) {
                console.error("Search error:", err);
                setError("Search failed. Please try again.");
                setResults([]);
            } finally {
                setLoading(false);
            }
        }, 500);
    }, []);

    const highlightText = useCallback((text, query) => {
        if (!query || !text) return text;
        try {
            const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, "gi");
            const parts = String(text).split(regex);
            return parts.map((part, i) =>
                regex.test(part) ? (
                    <span key={i} className="bg-yellow-200 text-gray-900 font-semibold px-1 rounded">
                        {part}
                    </span>
                ) : (
                    part
                )
            );
        } catch {
            return text;
        }
    }, []);

    const closeResults = useCallback(() => {
        setShowResults(false);
    }, []);

    return (
        <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-md shadow-sm">
            <div className="mx-auto w-full max-w-[1700px] px-2 sm:px-4 lg:px-5 xl:px-6">
                <div className="flex min-h-[60px] flex-wrap items-center gap-2 py-2 md:flex-nowrap md:justify-between md:py-0">
                    <div className="min-w-0 flex items-center gap-2">
                        <EastIcon className="text-gray-600" />
                        <h1 className="truncate text-sm font-semibold tracking-wide text-gray-800 uppercase sm:text-base md:text-lg">
                            {pathName || "Dashboard"}
                        </h1>
                    </div>

                    {(userType === "Admin" || userType === "Management") && (
                        <div className="order-3 relative w-full md:order-none md:mx-4 md:max-w-[420px] md:flex-1" ref={searchRef}>
                            <div className={`relative transition-all duration-300 rounded-xl ${focused
                                ? "shadow-[0_0_0_3px_rgba(156,163,175,0.3)] border-gray-400"
                                : "shadow-sm border-gray-200"
                                } border bg-white/70 backdrop-blur-md`}>
                                <SearchIcon className="absolute left-3 top-2.5 text-gray-600" fontSize="small" />
                                <input
                                    type="text"
                                    placeholder="Quick search..."
                                    value={query}
                                    onChange={handleSearch}
                                    onFocus={() => setFocused(true)}
                                    onBlur={() => setFocused(false)}
                                    className="w-full pl-10 pr-4 py-2.5 text-sm bg-transparent rounded-full outline-none text-gray-700 placeholder:text-gray-400"
                                />
                            </div>

                            {showResults && (
                                <div
                                    ref={resultsRef}
                                    className="animate-fade-down absolute top-13 left-0 z-50 max-h-[70vh] w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl md:left-1/2 md:w-[600px] md:-translate-x-1/2"
                                >
                                    <div className="overflow-y-auto max-h-[calc(70vh-50px)] p-4">
                                        {loading ? (
                                            <div className="flex flex-col items-center justify-center py-12">
                                                <div className="w-10 h-10 border-4 border-gray-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                                <p className="text-gray-500 text-sm">Searching...</p>
                                            </div>
                                        ) : error ? (
                                            <div className="flex flex-col items-center justify-center py-12">
                                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-3">
                                                    <CloseIcon className="text-red-500" fontSize="large" />
                                                </div>
                                                <p className="text-red-500 font-medium">{error}</p>
                                                <button
                                                    onClick={() => setError(null)}
                                                    className="mt-2 text-sm text-gray-600 hover:text-gray-900"
                                                >
                                                    Try again
                                                </button>
                                            </div>
                                        ) : results.length > 0 ? (
                                            <div className="space-y-4">
                                                {results.map((group, i) => (
                                                    <div key={i} className="bg-linear-to-br from-gray-50 to-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all">
                                                        <details className="group">
                                                            <summary className="flex items-center justify-between px-5 py-3 bg-linear-to-r from-gray-50 to-indigo-50 hover:from-gray-100 hover:to-indigo-100 cursor-pointer select-none transition-all">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                                                                    <span className="capitalize font-bold text-gray-800">{group.collection}</span>
                                                                    <span className="text-xs bg-gray-500 text-white px-2 py-0.5 rounded-full font-semibold">{group.total}</span>
                                                                </div>
                                                                <ExpandMoreIcon className="text-gray-600 group-open:rotate-180 transition-transform duration-300" />
                                                            </summary>

                                                            <div className="p-4 space-y-3">
                                                                {group.results.map((item, idx) => (
                                                                    <div key={idx} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-md transition-all duration-300">
                                                                        <div className="space-y-3">
                                                                            {Object.entries(item).map(([key, value]) => {
                                                                                if (["_id", "__v"].includes(key)) return null;

                                                                                const htmlFields = ["description", "survey_note"];

                                                                                if (key === "createdAt") {
                                                                                    return (
                                                                                        <div key={key} className="flex flex-col sm:flex-row sm:items-start gap-1 text-sm bg-cyan-50 px-2 py-1 rounded">
                                                                                            <span className="text-cyan-700 font-semibold capitalize min-w-[120px]">
                                                                                                Created:
                                                                                            </span>
                                                                                            <span className="text-cyan-900 flex-1 font-medium">
                                                                                                {new Date(value).toLocaleDateString("en-CA", {
                                                                                                    timeZone: "Europe/London",
                                                                                                })}

                                                                                            </span>
                                                                                        </div>
                                                                                    );
                                                                                }

                                                                                if (key === "client" && typeof value === "object" && value !== null) {
                                                                                    return (
                                                                                        <div key={key} className="bg-linear-to-br from-gray-50 to-emerald-50 border border-gray-200 p-3 rounded-lg">
                                                                                            <div className="flex items-center gap-2 mb-2">
                                                                                                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                                                                                                <span className="text-gray-700 font-bold text-sm capitalize">
                                                                                                    Client Info
                                                                                                </span>
                                                                                            </div>
                                                                                            <div className="pl-3.5 space-y-1">
                                                                                                {Object.entries(value).map(([clientKey, clientValue]) => {
                                                                                                    if (["_id", "__v", "updatedAt"].includes(clientKey)) return null;
                                                                                                    return (
                                                                                                        <div key={clientKey} className="flex gap-2 text-sm">
                                                                                                            <span className="text-gray-700 font-semibold capitalize min-w-[100px]">
                                                                                                                {clientKey.replace(/_/g, " ")}:
                                                                                                            </span>
                                                                                                            <span className="text-gray-700">
                                                                                                                {highlightText(String(clientValue || ""), query)}
                                                                                                            </span>
                                                                                                        </div>
                                                                                                    );
                                                                                                })}
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                }

                                                                                if (htmlFields.includes(key)) {
                                                                                    return (
                                                                                        <div key={key} className="bg-linear-to-br from-gray-50 to-gray-50 border border-gray-200 p-3 rounded-lg">
                                                                                            <div className="flex items-center gap-2 mb-2">
                                                                                                <div className="w-1.5 h-1.5 bg-gray-500 rounded-full"></div>
                                                                                                <span className="text-gray-700 font-bold text-sm capitalize">
                                                                                                    {key.replace(/_/g, " ")}
                                                                                                </span>
                                                                                            </div>
                                                                                            <div
                                                                                                className="text-gray-700 text-sm leading-relaxed pl-3.5 description-view"
                                                                                                dangerouslySetInnerHTML={{
                                                                                                    __html: value || `<em class="text-gray-400">No ${key.replace(/_/g, " ")}</em>`
                                                                                                }}
                                                                                            />
                                                                                        </div>
                                                                                    );
                                                                                }

                                                                                return (
                                                                                    <div key={key} className="flex flex-col sm:flex-row sm:items-start gap-1 text-sm">
                                                                                        <span className="text-gray-500 font-semibold capitalize min-w-[120px]">
                                                                                            {key.replace(/_/g, " ")}:
                                                                                        </span>
                                                                                        <span className="text-gray-800 flex-1">
                                                                                            {highlightText(String(value || ""), query)}
                                                                                        </span>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </details>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-12">
                                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                                    <SearchIcon className="text-gray-400" fontSize="large" />
                                                </div>
                                                <p className="text-gray-500 font-medium">No results found</p>
                                                <p className="text-gray-400 text-sm mt-1">Try different keywords</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="sticky bottom-0 left-0 bg-white border-t border-gray-200">
                                        <button
                                            className="w-full py-3 text-gray-600 text-sm font-medium cursor-pointer hover:text-gray-900 hover:bg-gray-50 flex items-center justify-center gap-2 transition-all"
                                            onClick={closeResults}
                                        >
                                            <CloseIcon fontSize="small" /> Close
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="ml-auto flex items-center gap-3 md:ml-0 md:gap-5">
                        <div className="relative hidden md:flex items-center">
                            <button
                                onClick={() => setShowLogout(!showLogout)}
                                className="flex items-center gap-2 py-1 px-4 bg-white border border-gray-200 rounded-full shadow-sm hover:shadow-md hover:bg-gray-50 transition-all duration-200 cursor-pointer"
                            >
                                <div className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full">
                                    <PersonRoundedIcon className="text-gray-600" fontSize="small" />
                                </div>
                                {userName && <span className="font-medium text-gray-700 capitalize">{userName}</span>}
                            </button>

                            {showLogout && (
                                <div className="absolute right-0 top-12 w-44 bg-white shadow-lg rounded-xl border border-gray-100 animate-fade-down z-30">
                                    <NavLink
                                        to="/settings"
                                        className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-50 transition"
                                    >
                                        <SettingsOutlinedIcon fontSize="small" /> Settings
                                    </NavLink>
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-2 w-full text-left px-4 py-2 text-gray-700 hover:bg-red-50 hover:text-red-600 transition cursor-pointer"
                                    >
                                        <LogoutOutlinedIcon fontSize="small" /> Logout
                                    </button>
                                </div>
                            )}
                        </div>

                        <button
                            className="rounded-md border border-gray-300 p-2 transition hover:bg-gray-100 md:hidden"
                            onClick={() => setShowMenu(!showMenu)}
                        >
                            <ListIcon />
                        </button>
                    </div>
                </div>
            </div>

            {showMenu && (
                <div className="animate-fade-down border-t border-gray-100 bg-white shadow-sm md:hidden">
                    <SideMenu />
                    <div className="flex justify-around border-t border-gray-100 py-3">
                        <NavLink
                            to="/settings"
                            className="rounded-md bg-gray-600 p-2 text-white transition hover:bg-gray-700"
                        >
                            <SettingsOutlinedIcon />
                        </NavLink>
                        <button
                            onClick={handleLogout}
                            className="rounded-md bg-red-600 p-2 text-white transition hover:bg-red-700"
                        >
                            <LogoutOutlinedIcon />
                        </button>
                    </div>
                </div>
            )}
        </header>
    );
}
