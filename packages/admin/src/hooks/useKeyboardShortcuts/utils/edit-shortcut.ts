import isMac from "./is-mac";

/** Recognizes undo and redo using typed letters for Cmd/Ctrl+Z and Shift+Cmd/Ctrl+Z, plus Ctrl+Y outside macOS. */
const getEditShortcut = (
	event: Pick<
		KeyboardEvent,
		"key" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey"
	>,
): "undo" | "redo" | undefined => {
	if (!(event.metaKey || event.ctrlKey) || event.altKey) return undefined;

	const key = event.key.toLowerCase();
	if (key === "z") return event.shiftKey ? "redo" : "undo";
	if (key === "y" && !event.shiftKey && !isMac()) return "redo";
	return undefined;
};

export default getEditShortcut;
