import { useRef, useEffect, useState } from "react";

export default function RichTextEditor({
    value,
    defaultValue = "",
    onChange,
    className = "",
    style = {}
}) {
    const editorRef = useRef(null);
    const lastValueRef = useRef("");
    const [active, setActive] = useState({});
    const isControlled = value !== undefined;

    useEffect(() => {
        if (!editorRef.current) return;

        if (isControlled && value !== lastValueRef.current) {
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


            </div>

            <div
                ref={editorRef}
                contentEditable
                suppressContentEditableWarning
                onInput={handleChange}
                onKeyUp={updateActive}
                onMouseUp={updateActive}
                onKeyDown={handleKeyDown}
                className="description-editor min-h-[300px] overflow-y-auto p-4 outline-none text-gray-800"
                style={{ fontSize: 14, lineHeight: 1.5 }}
            />


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
      `}</style>
        </div>
    );
}

function ToolButton({ active, onClick, children }) {
    return (
        <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={onClick}
            className={`px-2 py-1 rounded ${active ? "bg-blue-200" : "hover:bg-gray-200"
                }`}
        >
            {children}
        </button>
    );
}