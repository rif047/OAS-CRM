import Layout from "../../Layout";
import { useEffect, useState } from "react";
import { formatLondonDateTime } from "../../utils/formatters";

export default function Settings() {
    document.title = "Settings";
    const API = import.meta.env.VITE_SERVER_URL + "/db";

    const [backups, setBackups] = useState([]);
    const [restoreFile, setRestoreFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [showCreateBackupModal, setShowCreateBackupModal] = useState(false);
    const [actionModal, setActionModal] = useState({ open: false, type: "", name: "" });
    const token = localStorage.getItem("token");
    const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
    const parseErrorMessage = async (res, fallback) => {
        try {
            const json = await res.json();
            return json?.message || json?.error || fallback;
        } catch {
            return fallback;
        }
    };

    const loadBackups = async () => {
        try {
            const res = await fetch(`${API}/backups`, { headers: authHeaders });
            if (!res.ok) throw new Error(await parseErrorMessage(res, "Failed to load backups"));
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
        setLoading(true);
        try {
            const res = await fetch(`${API}/backup`, { method: "POST", headers: authHeaders });
            if (!res.ok) throw new Error(await parseErrorMessage(res, "Backup failed"));
            await loadBackups();
            setShowCreateBackupModal(false);
        } catch (err) {
            alert(err.message || "Backup failed");
        } finally {
            setLoading(false);
        }
    };


    const handleDownload = async (name) => {
        try {
            const res = await fetch(`${API}/backups/${encodeURIComponent(name)}`, { headers: authHeaders });
            if (!res.ok) throw new Error("Download failed");
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = name;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch {
            alert("Download failed");
        }
    };


    const handleDelete = async (name) => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/backups/${encodeURIComponent(name)}`, { method: "DELETE", headers: authHeaders });
            if (!res.ok) throw new Error(await parseErrorMessage(res, "Delete failed"));
            await loadBackups();
        } catch (err) {
            alert(err.message || "Delete failed");
        } finally {
            setLoading(false);
        }
    };


    const handleRestoreFromServer = async (name) => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/restore-from-file/${encodeURIComponent(name)}`, { method: "POST", headers: authHeaders });
            if (!res.ok) throw new Error(await parseErrorMessage(res, "Restore failed"));
            const json = await res.json();
            alert(json.message || "Restored successfully");
        } catch (err) {
            alert(err.message || "Restore failed");
        } finally {
            setLoading(false);
        }
    };

    const openActionModal = (type, name) => {
        setActionModal({ open: true, type, name });
    };

    const closeActionModal = () => {
        if (loading) return;
        setActionModal({ open: false, type: "", name: "" });
    };

    const getActionModalContent = () => {
        if (actionModal.type === "download") {
            return {
                title: "Download Backup",
                message: `Do you want to download "${actionModal.name}" now?`,
                confirmText: "Download",
                confirmClass: "bg-slate-900 hover:bg-slate-800",
                loadingText: "Downloading...",
            };
        }
        if (actionModal.type === "restore") {
            return {
                title: "Restore Backup",
                message: `Restore database from "${actionModal.name}"? This will overwrite current data.`,
                confirmText: "Restore",
                confirmClass: "bg-amber-600 hover:bg-amber-700",
                loadingText: "Restoring...",
            };
        }
        return {
            title: "Delete Backup",
            message: `Delete "${actionModal.name}" permanently? This action cannot be undone.`,
            confirmText: "Delete",
            confirmClass: "bg-red-600 hover:bg-red-700",
            loadingText: "Deleting...",
        };
    };

    const handleActionModalConfirm = async () => {
        const { type, name } = actionModal;
        if (!name) return;

        if (type === "download") {
            await handleDownload(name);
            setActionModal({ open: false, type: "", name: "" });
            return;
        }

        if (type === "restore") {
            await handleRestoreFromServer(name);
            setActionModal({ open: false, type: "", name: "" });
            return;
        }

        if (type === "delete") {
            await handleDelete(name);
            setActionModal({ open: false, type: "", name: "" });
        }
    };


    const handleRestoreUpload = async () => {
        if (!restoreFile) return alert("Choose a file first");
        if (!confirm("Restore database from selected file? This will overwrite current Data.")) return;
        setLoading(true);
        try {
            const fd = new FormData();
            fd.append("backupFile", restoreFile);
            const res = await fetch(`${API}/restore`, { method: "POST", headers: authHeaders, body: fd });
            if (!res.ok) throw new Error(await parseErrorMessage(res, "Restore failed"));
            const json = await res.json();
            alert(json.message || "Restored successfully");
            await loadBackups();
        } catch (err) {
            alert(err.message || "Restore failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout>
            <section className="leadPageShell">
                {/* Top Section */}
                <div className="leadPageHeader">
                    <div>
                        <div className="leadPageHeaderLeft">
                            <h1 className="leadPageTitle">Database Backups</h1>
                        </div>
                        <p className="text-xs text-slate-200 mt-1">
                            Auto backup every 7 days - Server keeps <strong>max 10 backups</strong>.
                        </p>
                    </div>
                    <div className="leadPageHeaderActions gap-2">
                        <button
                            onClick={() => setShowCreateBackupModal(true)}
                            disabled={loading}
                            className={`leadPagePrimaryBtn px-4 ${loading
                                ? "opacity-70 cursor-not-allowed"
                                : "cursor-pointer"
                                }`}
                        >
                            {loading ? "Working..." : "Create Backup"}
                        </button>
                        <button
                            onClick={loadBackups}
                            disabled={loading}
                            className={`inline-flex h-[38px] items-center rounded-[0.62rem] border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm ${loading
                                ? "opacity-70 cursor-not-allowed"
                                : "hover:bg-slate-100 cursor-pointer"
                                }`}
                        >
                            Refresh
                        </button>
                    </div>
                </div>

                <div className="p-4 sm:p-5">
                    {/* Upload / Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Upload Section */}
                        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Upload & Restore (local file)
                            </label>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="file"
                                    accept=".json,.gz"
                                    onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
                                    className="flex-1 rounded-lg border border-slate-300 bg-white p-2 text-sm text-slate-700"
                                />
                                <button
                                    onClick={handleRestoreUpload}
                                    disabled={loading}
                                    className={`h-9 rounded-lg border border-slate-300 bg-slate-900 px-4 text-sm font-semibold text-white ${loading
                                        ? "opacity-70 cursor-not-allowed"
                                        : "hover:bg-slate-800 cursor-pointer"
                                        }`}
                                >
                                    Restore
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 mt-2">
                                If you already have a backup file on your PC, upload and restore it here.
                            </p>
                        </div>

                        {/* Info Section */}
                        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Quick Info</label>
                            <ul className="text-sm text-slate-600 space-y-1">
                                <li>• Max backups kept: <strong>10</strong></li>
                                <li>• Auto backup: every <strong>7 days</strong></li>
                                <li>• You can Download / Restore / Delete from the table below</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm mx-4 sm:mx-5 mb-4">
                    <h2 className="px-4 py-3 text-sm font-semibold text-slate-700 border-b border-slate-200 bg-slate-50">
                        Saved Backups
                    </h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-100 text-center text-xs uppercase tracking-[0.08em] text-slate-600">
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
                                            className="text-center odd:bg-white even:bg-slate-50/80"
                                        >
                                            <td className="px-4 sm:px-6 py-4 text-slate-700">
                                                {formatLondonDateTime(b.date, "-")}
                                            </td>
                                            <td className="px-4 sm:px-6 py-4 text-slate-700 break-all">
                                                {b.name}
                                            </td>
                                            <td className="px-4 sm:px-6 py-4 text-slate-700">
                                                {b.size ? `${(b.size / 1024).toFixed(2)} KB` : "-"}
                                            </td>
                                            <td className="px-4 sm:px-6 py-4 text-center space-x-1 sm:space-x-2 flex flex-wrap justify-center gap-1">
                                                <button
                                                    onClick={() => openActionModal("download", b.name)}
                                                    disabled={loading}
                                                    className="text-slate-600 font-bold hover:underline disabled:opacity-50 cursor-pointer text-xs sm:text-sm"
                                                >
                                                    Download
                                                </button>
                                                <button
                                                    onClick={() => openActionModal("restore", b.name)}
                                                    disabled={loading}
                                                    className="text-slate-700 font-bold hover:underline disabled:opacity-50 cursor-pointer px-1 sm:px-2 border-x-0 sm:border-x-2 text-xs sm:text-sm"
                                                >
                                                    Restore
                                                </button>
                                                <button
                                                    onClick={() => openActionModal("delete", b.name)}
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
                                            className="text-center py-6 text-slate-500 text-sm"
                                        >
                                            No backups found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {showCreateBackupModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
                    onClick={() => !loading && setShowCreateBackupModal(false)}
                >
                    <div
                        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-semibold text-slate-800">Create New Backup</h3>
                        <p className="mt-2 text-sm text-slate-600">
                            Are you sure you want to create a backup now? The server keeps a maximum of 10 backups.
                        </p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                onClick={() => setShowCreateBackupModal(false)}
                                disabled={loading}
                                className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateBackup}
                                disabled={loading}
                                className="cursor-pointer rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                {loading ? "Creating..." : "Create Backup"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {actionModal.open && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4"
                    onClick={closeActionModal}
                >
                    <div
                        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-semibold text-slate-800">{getActionModalContent().title}</h3>
                        <p className="mt-2 text-sm text-slate-600">{getActionModalContent().message}</p>
                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                onClick={closeActionModal}
                                disabled={loading}
                                className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleActionModalConfirm}
                                disabled={loading}
                                className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-70 ${getActionModalContent().confirmClass}`}
                            >
                                {loading ? getActionModalContent().loadingText : getActionModalContent().confirmText}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </Layout>
    );
}
