import { useRef, useEffect, useState } from "react";
import axios from "axios";

export default function RichTextEditor({
    value,
    defaultValue = "",
    onChange,
    enableImageUpload = true,
    imageUploadUrl = `${import.meta.env.VITE_SERVER_URL}/api/leads/description-images`,
    className = "",
    style = {}
}) {
    const editorRef = useRef(null);
    const imageInputRef = useRef(null);
    const lastValueRef = useRef("");
    const changeTimerRef = useRef(null);
    const [active, setActive] = useState({});
    const [uploading, setUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState("");
    const [uploadPercent, setUploadPercent] = useState(0);
    const [selectedImageSrc, setSelectedImageSrc] = useState("");
    const isControlled = value !== undefined;

    useEffect(() => {
        if (!editorRef.current) return;

        if (isControlled && value !== lastValueRef.current) {
            // Keep caret stable while typing; sync external value only when editor is not focused.
            if (document.activeElement === editorRef.current) return;
            editorRef.current.innerHTML = value || "";
            lastValueRef.current = value || "";
        }
    }, [value, isControlled]);

    useEffect(() => {
        if (!isControlled && editorRef.current && defaultValue) {
            editorRef.current.innerHTML = defaultValue;
            lastValueRef.current = defaultValue;
        }
    }, []);

    useEffect(() => {
        return () => {
            if (changeTimerRef.current) clearTimeout(changeTimerRef.current);
        };
    }, []);

    const updateActive = () => {
        const sel = window.getSelection();
        const node = sel?.anchorNode?.parentElement;

        const isUL = !!node?.closest("ul");
        const isOL = !!node?.closest("ol");

        setActive({
            bold: document.queryCommandState("bold"),
            italic: document.queryCommandState("italic"),
            underline: document.queryCommandState("underline"),
            ul: isUL,
            ol: isOL,
        });
    };

    const handleChange = () => {
        if (!editorRef.current) return;
        const html = editorRef.current.innerHTML;
        lastValueRef.current = html;
        if (changeTimerRef.current) clearTimeout(changeTimerRef.current);
        changeTimerRef.current = setTimeout(() => {
            onChange?.(html);
        }, 120);
    };

    const flushChange = () => {
        if (!editorRef.current) return;
        const html = editorRef.current.innerHTML;
        lastValueRef.current = html;
        if (changeTimerRef.current) clearTimeout(changeTimerRef.current);
        onChange?.(html);
    };

    const wrapSelection = (tag) => {
        editorRef.current?.focus();

        const cmd = {
            STRONG: "bold",
            EM: "italic",
            U: "underline",
            S: "strikeThrough",
        }[tag];

        if (cmd) {
            document.execCommand(cmd, false, null);
            updateActive();
            handleChange();
        }
    };

    const toggleList = (type) => {
        editorRef.current?.focus();
        document.execCommand(
            type === "UL" ? "insertUnorderedList" : "insertOrderedList",
            false,
            null
        );
        updateActive();
        handleChange();
    };

    const addLink = () => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;

        const url = prompt("Enter URL:");
        if (!url) return;

        const fullUrl = url.startsWith("http") ? url : `https://${url}`;
        document.execCommand("createLink", false, fullUrl);
        handleChange();
        updateActive();
    };

    const handleKeyDown = (e) => {
        if ((e.key === "Backspace" || e.key === "Delete") && selectedImageSrc) {
            e.preventDefault();
            const selectedImage = editorRef.current?.querySelector(`img[data-selected="true"]`);
            if (selectedImage) {
                selectedImage.remove();
                setSelectedImageSrc("");
                handleChange();
                updateActive();
            }
            return;
        }

        if (e.key !== "Enter") return;

        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const li = range.startContainer.parentElement?.closest("li");

        if (li) {
            if (li.textContent.trim() === "") {
                e.preventDefault();
                document.execCommand("outdent");
                handleChange();
                updateActive();
            }
            return;
        }

        e.preventDefault();
        editorRef.current?.focus();

        if (e.shiftKey) {
            document.execCommand("insertHTML", false, "<br>");
        }
        else {
            document.execCommand("insertHTML", false, "<br><br>");
        }

        handleChange();
        updateActive();
    };

    const handleEditorClick = (e) => {
        if (!editorRef.current) return;
        const target = e.target;
        const allImages = editorRef.current.querySelectorAll("img");
        allImages.forEach((img) => img.removeAttribute("data-selected"));

        if (target instanceof HTMLImageElement) {
            target.setAttribute("data-selected", "true");
            setSelectedImageSrc(target.src || "selected");
            return;
        }

        if (selectedImageSrc) setSelectedImageSrc("");
    };

    const removeSelectedImage = () => {
        const selectedImage = editorRef.current?.querySelector(`img[data-selected="true"]`);
        if (!selectedImage) return;
        selectedImage.remove();
        setSelectedImageSrc("");
        handleChange();
        updateActive();
    };

    const getImageCount = () => {
        if (!editorRef.current) return 0;
        return editorRef.current.querySelectorAll("img").length;
    };

    const handleImageButton = () => {
        if (uploading) return;
        imageInputRef.current?.click();
    };

    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        e.target.value = "";

        if (!files.length) return;
        if (!imageUploadUrl) {
            alert("Image upload endpoint is not configured.");
            return;
        }

        const existingImages = getImageCount();
        if (existingImages + files.length > 10) {
            alert("Maximum 10 images allowed.");
            return;
        }

        const invalidSize = files.find((file) => file.size > 5 * 1024 * 1024);
        if (invalidSize) {
            alert("Each image must be 5MB or less.");
            return;
        }

        const invalidType = files.find((file) => !file.type.startsWith("image/"));
        if (invalidType) {
            alert("Only image files are allowed.");
            return;
        }

        const formData = new FormData();
        files.forEach((file) => formData.append("images", file));

        try {
            setUploading(true);
            setUploadPercent(1);
            setUploadStatus(`Uploading ${files.length} image${files.length > 1 ? "s" : ""}...`);

            const response = await axios.post(imageUploadUrl, formData, {
                onUploadProgress: (progressEvent) => {
                    const total = progressEvent.total || 0;
                    if (!total) return;
                    const rawPercent = Math.round((progressEvent.loaded * 100) / total);
                    const percent = Math.min(95, Math.max(1, rawPercent));
                    setUploadPercent(percent);
                    if (rawPercent >= 100) {
                        setUploadStatus("Processing images on server...");
                        setUploadPercent(0);
                    }
                }
            });
            const payload = response?.data || {};
            if (!Array.isArray(payload?.urls)) throw new Error(payload?.error || payload?.message || "Upload failed.");

            editorRef.current?.focus();
            payload.urls.forEach((url) => {
                document.execCommand("insertHTML", false, `<img src="${url}" alt="description-image" />`);
                document.execCommand("insertHTML", false, "<br><br>");
            });

            flushChange();
            updateActive();
            setUploadPercent(100);
            setUploadStatus(`Uploaded ${payload.urls.length} image${payload.urls.length > 1 ? "s" : ""}.`);
        } catch (error) {
            alert(error?.response?.data || error?.message || "Image upload failed.");
            setUploadStatus("Upload failed.");
        } finally {
            setUploading(false);
            setTimeout(() => {
                setUploadStatus("");
                setUploadPercent(0);
            }, 1800);
        }
    };

    return (
        <div className={`w-full border border-gray-300 rounded-lg bg-white mt-2 ${className}`} style={style}>
            <div className="flex gap-1 p-2 border-b bg-gray-50">
                <ToolButton active={active.bold} onClick={() => wrapSelection("STRONG")}>
                    B
                </ToolButton>
                <ToolButton active={active.italic} onClick={() => wrapSelection("EM")}>
                    I
                </ToolButton>
                <ToolButton active={active.underline} onClick={() => wrapSelection("U")}>
                    U
                </ToolButton>

                <ToolButton onClick={addLink}>🔗</ToolButton>

                <ToolButton active={active.ul} onClick={() => toggleList("UL")}>
                    •
                </ToolButton>
                <ToolButton active={active.ol} onClick={() => toggleList("OL")}>
                    1
                </ToolButton>

                {enableImageUpload && (
                    <ToolButton onClick={handleImageButton}>
                        {uploading ? "..." : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.8" />
                                <circle cx="9" cy="10" r="1.6" fill="currentColor" />
                                <path d="M5.5 17L11 12.5L14.5 15.5L17 13.5L20 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        )}
                    </ToolButton>
                )}

                {enableImageUpload && (
                    <ToolButton
                        onClick={removeSelectedImage}
                        active={!!selectedImageSrc}
                        disabled={!selectedImageSrc}
                    >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path d="M4 7H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            <path d="M9 7V5.8C9 5.36 9.36 5 9.8 5H14.2C14.64 5 15 5.36 15 5.8V7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            <path d="M8 10V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            <path d="M12 10V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            <path d="M16 10V18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                            <path d="M6.8 7H17.2L16.6 19.2C16.58 19.64 16.22 20 15.78 20H8.22C7.78 20 7.42 19.64 7.4 19.2L6.8 7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                        </svg>
                    </ToolButton>
                )}
            </div>

            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleChange}
                onBlur={flushChange}
                onKeyUp={updateActive}
                onMouseUp={updateActive}
                onKeyDown={handleKeyDown}
                onClick={handleEditorClick}
                data-gramm="false"
                data-gramm_editor="false"
                data-enable-grammarly="false"
                spellCheck={false}
                className="description-editor min-h-[300px] overflow-y-auto p-4 outline-none text-gray-800"
                style={{ fontSize: 14, lineHeight: 1.5 }}
            />

            {enableImageUpload && (
                <>
                    <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        onChange={handleImageUpload}
                    />
                    <div className="px-3 py-1 text-xs text-gray-500 border-t bg-gray-50">
                        {uploading
                            ? (uploadStatus === "Processing images on server..."
                                ? uploadStatus
                                : `${uploadStatus} ${uploadPercent}%`)
                            : (uploadStatus || "Image limits: max 10 images per comment, max 5MB each.")}
                    </div>
                </>
            )}

            <style>{`
        .description-editor:empty:before {
          content: "Write Description...";
          color: #9ca3af;
        }
        [contenteditable] ul {
          list-style: disc;
          padding-left: 28px;
        }
        [contenteditable] ol {
          list-style: decimal;
          padding-left: 28px;
        }
        [contenteditable] a {
          color: #2563eb;
          text-decoration: underline;
        }
        [contenteditable] img {
          width: auto;
          max-width: min(260px, 100%);
          max-height: 180px;
          object-fit: cover;
          display: block;
          margin: 8px 0;
          border-radius: 6px;
        }
        [contenteditable] img[data-selected="true"] {
          outline: 2px solid #2563eb;
          outline-offset: 2px;
        }
      `}</style>
        </div>
    );
}

function ToolButton({ active, onClick, children, disabled = false }) {
    return (
        <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            disabled={disabled}
            className={`px-2 py-1 rounded transition ${disabled
                    ? "cursor-not-allowed text-gray-300"
                    : active
                        ? "bg-blue-200"
                        : "hover:bg-gray-200"
                }`}
        >
            {children}
        </button>
    );
}
