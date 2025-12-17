import { useState, useEffect } from "react";
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

    const pathName = window.location.pathname.split("/").slice(1, 3).join(" > ");


    useEffect(() => {
        const userData = localStorage.getItem("user");
        if (userData) {
            const user = JSON.parse(userData);
            setUserName(user.name || user.username || "");
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("userType");
        window.location.href = "/";
    };

    let debounceTimer;

    const handleSearch = (e) => {
        const value = e.target.value;
        setQuery(value);

        if (debounceTimer) clearTimeout(debounceTimer);

        debounceTimer = setTimeout(async () => {
            if (!value.trim()) {
                setResults([]);
                setShowResults(false);
                return;
            }

            setLoading(true);
            try {
                const res = await axios.get(
                    `${import.meta.env.VITE_SERVER_URL}/search?query=${encodeURIComponent(value)}`
                );

                const mappedResults = res.data.map((group) => ({
                    ...group,
                    total: group.results.length,
                }));

                setResults(mappedResults);
                setShowResults(true);
            } catch (err) {
                console.error("Search error:", err);
            } finally {
                setLoading(false);
            }
        }, 500);
    };


    const highlightText = (text, query) => {
        if (!query) return text;
        const regex = new RegExp(`(${query})`, "gi");
        const parts = text.split(regex);
        return parts.map((part, i) =>
            regex.test(part) ? (
                <span key={i} className="text-red-400 font-bold">
                    {part}
                </span>
            ) : (
                part
            )
        );
    };



    return (
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-[60px]">
                    <div className="flex items-center gap-2">
                        <EastIcon className="text-gray-600" />
                        <h1 className="tracking-wide font-semibold text-gray-800 text-base md:text-lg uppercase">
                            {pathName || "Dashboard"}
                        </h1>
                    </div>

                    {(userType === "Admin" || userType === "Management") && (
                        <div className="flex-1 mx-4 relative max-w-full md:max-w-[400px]">
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
                                    className="absolute top-13 left-1/2 w-[320px] md:w-[600px] bg-white border border-gray-100 shadow-2xl rounded-b-2xl max-h-[70vh] overflow-y-auto z-50 animate-fade-down
        -translate-x-1/2"
                                >
                                    {loading ? (
                                        <div className="text-center py-4 text-gray-500">Searching...</div>
                                    ) : results.length > 0 ? (
                                        results.map((group, i) => (
                                            <details
                                                key={i}
                                                className="group border border-gray-100 rounded-xl overflow-hidden mb-2 shadow-sm hover:shadow-md transition-all"
                                            >
                                                <summary className="flex items-center justify-start px-4 py-2 bg-gray-50 hover:bg-gray-50 text-gray-700 font-semibold cursor-pointer select-none">
                                                    <span className="capitalize mr-1">{group.collection}</span>
                                                    <span className="text-gray-500 text-xs"> ({group.total})</span>
                                                    <ExpandMoreIcon className="group-open:rotate-180 transition-transform" />
                                                </summary>

                                                <div className="p-3 grid grid-cols-1 gap-3">
                                                    {group.results.map((item, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-lg transition-all duration-200"
                                                        >
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                                                {Object.entries(item).map(([key, value]) => {
                                                                    if (["_id", "createdAt", "__v"].includes(key)) return null;
                                                                    return (
                                                                        <div key={key}>
                                                                            <span className="text-gray-500 font-medium capitalize">
                                                                                {key.replace(/_/g, " ")}:
                                                                            </span>
                                                                            <span className="text-gray-800 ml-1" style={{ whiteSpace: 'pre-line' }}>
                                                                                {typeof value === "object"
                                                                                    ? JSON.stringify(value)
                                                                                    : highlightText(String(value), query)}
                                                                            </span>

                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </details>
                                        ))
                                    ) : (
                                        <div className="text-center py-4 text-gray-500">No results found</div>
                                    )}

                                    <div className="sticky bottom-0 left-0 bg-white border-t border-gray-100">
                                        <button
                                            className="w-full py-2 text-gray-500 text-sm cursor-pointer hover:text-gray-700 bg-gray-50 hover:bg-gray-200 flex items-center justify-center gap-1 transition-all"
                                            onClick={() => setShowResults(false)}
                                        >
                                            <CloseIcon fontSize="small" /> Close
                                        </button>
                                    </div>
                                </div>
                            )}


                        </div>
                    )}

                    <div className="flex items-center gap-5">
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
                            className="md:hidden p-2 border border-gray-300 rounded-md hover:bg-gray-100 transition"
                            onClick={() => setShowMenu(!showMenu)}
                        >
                            <ListIcon />
                        </button>
                    </div>
                </div>
            </div>

            {showMenu && (
                <div className="md:hidden bg-white border-t border-gray-100 shadow-sm animate-fade-down">
                    <SideMenu />
                    <div className="flex justify-around py-3 border-t border-gray-100">
                        <NavLink
                            to="/settings"
                            className="p-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition"
                        >
                            <SettingsOutlinedIcon />
                        </NavLink>
                        <button
                            onClick={handleLogout}
                            className="p-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                        >
                            <LogoutOutlinedIcon />
                        </button>
                    </div>
                </div>
            )}
        </header>
    );
}
