export const DATATABLE_EDIT_HIGHLIGHT_KEY = 'crm_datatable_last_edited_row';
export const DATATABLE_HIGHLIGHT_EVENT = 'crm-datatable-highlight';

export function markEditedRowForHighlight(rowId, routeKey = window.location.pathname, durationMs = 5000) {
    if (!rowId) return;

    const payload = {
        rowId,
        routeKey,
        expiresAt: Date.now() + durationMs,
    };

    sessionStorage.setItem(DATATABLE_EDIT_HIGHLIGHT_KEY, JSON.stringify(payload));

    window.dispatchEvent(
        new CustomEvent(DATATABLE_HIGHLIGHT_EVENT, {
            detail: payload,
        })
    );
}
