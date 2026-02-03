import Layout from "../../Layout";
import { useEffect, useState } from "react";

export default function Settings() {
    document.title = "Settings";
    const API = import.meta.env.VITE_SERVER_URL + "/db";

    const [backups, setBackups] = useState([]);
    const [restoreFile, setRestoreFile] = useState(null);
    const [loading, setLoading] = useState(false);

    const loadBackups = async () => {
        try {
            const res = await fetch(`${API}/backups`);
            const data = await res.json();
            setBackups(data || []);
        } catch (err) {
            console.error("Failed to load backups", err);
            setBackups([]);
        }
    };

    useEffect(() => {
        loadBackups();
    }, []);


    const handleCreateBackup = async () => {
        if (!confirm("Create a new backup now? (Server keeps max 10 backups)")) return;
        setLoading(true);
        try {
            const res = await fetch(`${API}/backup`, { method: "POST" });
            const json = await res.json();
            await loadBackups();
        } catch (err) {
            alert("Backup failed");
        } finally {
            setLoading(false);
        }
    };


    const handleDownload = (name) => {
        window.open(`${API}/backups/${encodeURIComponent(name)}`, "_blank");
    };


    const handleDelete = async (name) => {
        if (!confirm(`Delete backup "${name}" permanently? This cannot be undone.`)) return;
        setLoading(true);
        try {
            const res = await fetch(`${API}/backups/${encodeURIComponent(name)}`, { method: "DELETE" });
            const json = await res.json();
            await loadBackups();
        } catch (err) {
            alert("Delete failed");
        } finally {
            setLoading(false);
        }
    };


    const handleRestoreFromServer = async (name) => {
        if (!confirm(`Restore database from "${name}"? This will overwrite current Data.`)) return;
        setLoading(true);
        try {
            const res = await fetch(`${API}/restore-from-file/${encodeURIComponent(name)}`, { method: "POST" });
            const json = await res.json();
            alert(json.message || "Restored successfully");
        } catch (err) {
            alert("Restore failed");
        } finally {
            setLoading(false);
        }
    };


    const handleRestoreUpload = async () => {
        if (!restoreFile) return alert("Choose a file first");
        if (!confirm("Restore database from selected file? This will overwrite current Data.")) return;
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append("backupFile", restoreFile);
            const res = await fetch(`${API}/restore`, { method: "POST", body: fd });
            const json = await res.json();
            alert(json.message || "Restored successfully");
            await loadBackups();
        } catch (err) {
            alert("Restore failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <div className="p-4 sm:p-6 max-w-7xl mx-auto">
                {/* Top Section */}
                <div className="bg-white shadow-lg rounded-2xl p-4 sm:p-6 mb-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-semibold">Database Backups</h1>
                            <p className="text-xs sm:text-sm text-gray-500 mt-1">
                                Auto backup every 7 days — Server keeps <strong>max 10 backups</strong>.
                            </p>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                            <button
                                onClick={handleCreateBackup}
                                disabled={loading}
                                className={`px-4 py-2 rounded-lg shadow text-white text-sm sm:text-base ${loading
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-[#535353] hover:bg-black cursor-pointer"
                                    }`}
                            >
                                {loading ? "Working..." : "Create Backup"}
                            </button>
                            <button
                                onClick={loadBackups}
                                disabled={loading}
                                className={`px-4 py-2 rounded-lg text-sm sm:text-base ${loading
                                    ? "bg-gray-200 cursor-not-allowed"
                                    : "bg-gray-200 hover:bg-gray-300 cursor-pointer"
                                    }`}
                            >
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Upload / Info */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Upload Section */}
                        <div className="p-4 border rounded-lg">
                            <label className="block text-sm font-medium mb-2">
                                Upload & Restore (local file)
                            </label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="file"
                                    accept=".json,.gz"
                                    onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                                    className="flex-1 p-2 border rounded text-sm"
                                />
                                <button
                                    onClick={handleRestoreUpload}
                                    disabled={loading}
                                    className={`px-4 py-2 rounded text-white text-sm ${loading
                                        ? "bg-gray-400 cursor-not-allowed"
                                        : "bg-[#535353] hover:bg-black cursor-pointer"
                                        }`}
                                >
                                    Restore
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                If you already have a backup file on your PC, upload and restore it here.
                            </p>
                        </div>

                        {/* Info Section */}
                        <div className="p-4 border rounded-lg">
                            <label className="block text-sm font-medium mb-2">Quick Info</label>
                            <ul className="text-sm text-gray-600 space-y-1">
                                <li>• Max backups kept: <strong>10</strong></li>
                                <li>• Auto backup: every <strong>7 days</strong></li>
                                <li>• You can Download / Restore / Delete from the table below</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white shadow rounded-lg p-4">
                    <h2 className="text-lg font-medium mb-3">Saved Backups</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="text-xs text-[#080808] uppercase bg-[#b4b4b4] text-center">
                                <tr>
                                    <th className="px-4 sm:px-6 py-3">Date</th>
                                    <th className="px-4 sm:px-6 py-3">Backup File</th>
                                    <th className="px-4 sm:px-6 py-3">File Size</th>
                                    <th className="px-4 sm:px-6 py-3 text-center">Action</th>
                                </tr>
                            </thead>

                            <tbody>
                                {backups.length > 0 ? (
                                    backups.map((b, i) => (
                                        <tr
                                            key={i}
                                            className="odd:bg-white even:bg-gray-50 border-gray-200 text-center"
                                        >
                                            <td className="px-4 sm:px-6 py-4 text-gray-700">
                                                {b.date ? new Date(b.date).toLocaleString() : "-"}
                                            </td>
                                            <td className="px-4 sm:px-6 py-4 text-gray-700 break-all">
                                                {b.name}
                                            </td>
                                            <td className="px-4 sm:px-6 py-4 text-gray-700">
                                                {b.size ? `${(b.size / 1024).toFixed(2)} KB` : "-"}
                                            </td>
                                            <td className="px-4 sm:px-6 py-4 text-center space-x-1 sm:space-x-2 flex flex-wrap justify-center gap-1">
                                                <button
                                                    onClick={() => handleDownload(b.name)}
                                                    disabled={loading}
                                                    className="text-gray-600 font-bold hover:underline disabled:opacity-50 cursor-pointer text-xs sm:text-sm"
                                                >
                                                    Download
                                                </button>
                                                <button
                                                    onClick={() => handleRestoreFromServer(b.name)}
                                                    disabled={loading}
                                                    className="text-gray-700 font-bold hover:underline disabled:opacity-50 cursor-pointer px-1 sm:px-2 border-x-0 sm:border-x-2 text-xs sm:text-sm"
                                                >
                                                    Restore
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(b.name)}
                                                    disabled={loading}
                                                    className="text-red-600 font-bold hover:underline disabled:opacity-50 cursor-pointer text-xs sm:text-sm"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td
                                            colSpan="4"
                                            className="text-center py-6 text-gray-500 text-sm"
                                        >
                                            No backups found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </Layout>
    );
}
