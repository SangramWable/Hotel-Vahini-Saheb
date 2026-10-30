function renderPaginationControls(containerId, page, totalPages, totalCount, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const pages = Math.max(1, Number(totalPages) || 1);
    const currentPage = Math.min(Math.max(1, Number(page) || 1), pages);
    const previous = document.createElement("button");
    previous.type = "button";
    previous.textContent = "Previous";
    previous.disabled = currentPage <= 1;
    previous.setAttribute("aria-label", "Previous page");
    previous.addEventListener("click", () => onPageChange(currentPage - 1));

    const status = document.createElement("span");
    status.setAttribute("aria-live", "polite");
    status.textContent = `Page ${currentPage} of ${pages} · ${Number(totalCount) || 0} total`;

    const next = document.createElement("button");
    next.type = "button";
    next.textContent = "Next";
    next.disabled = currentPage >= pages;
    next.setAttribute("aria-label", "Next page");
    next.addEventListener("click", () => onPageChange(currentPage + 1));

    container.replaceChildren(previous, status, next);
}
