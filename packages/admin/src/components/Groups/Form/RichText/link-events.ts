/** Blocks native editor-link navigation and opens links only on Ctrl/Cmd-click. */
export const handleEditorLinkClick = (
	root: HTMLElement | undefined,
	event: MouseEvent,
): boolean => {
	const target = event.target;
	if (!(target instanceof Element)) return false;

	const anchor = target.closest<HTMLAnchorElement>("a[href]");
	if (!anchor || !root?.contains(anchor)) return false;

	event.preventDefault();
	if ((event.ctrlKey || event.metaKey) && anchor.href) {
		window.open(anchor.href, "_blank", "noopener,noreferrer");
	}

	return true;
};
