import { onCleanup, onMount } from "solid-js";
import isMac from "@/hooks/useKeyboardShortcuts/utils/is-mac";

const modKey = isMac() ? "⌘" : "Ctrl";

export const shortcutText = {
	changeLocale: `${modKey}+Shift+.`,
	newEntry: "Shift+T",
	toggleAgentPanel: `${modKey}+J`,
	undo: `${modKey}+Z`,
	redo: `${modKey}+Shift+Z`,
};

export const inModal = () =>
	!!document.querySelector('[role="dialog"][data-expanded]');

const useKeyboardShortcuts = (options: {
	changeLocale?: {
		permission: () => boolean;
		callback: () => void;
	};
	newEntry?: {
		permission: () => boolean;
		callback: () => void;
	};
	toggleAgentPanel?: {
		permission: () => boolean;
		callback: () => void;
	};
	// saveEntry?: {
	// 	permission: () => boolean;
	// 	callback: () => void;
	// };
}) => {
	const handleKeyDown = (e: KeyboardEvent) => {
		// change locale: meta/ctrl + shift + .
		if (options.changeLocale?.permission()) {
			if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.code === "Period") {
				e.preventDefault();
				e.stopPropagation();
				options.changeLocale.callback();
			}
		}

		// new entry: meta/cntrl + t
		if (options.newEntry?.permission()) {
			if (
				// (e.metaKey || e.ctrlKey) &&
				e.shiftKey &&
				e.key.toLowerCase() === "t"
			) {
				e.preventDefault();
				options.newEntry.callback();
			}
		}

		// toggle agent panel: meta/ctrl + j
		if (options.toggleAgentPanel?.permission()) {
			if (
				(e.metaKey || e.ctrlKey) &&
				!e.shiftKey &&
				!e.altKey &&
				e.code === "KeyJ"
			) {
				e.preventDefault();
				options.toggleAgentPanel.callback();
			}
		}

		// save entry: meta/cntrl + s
		// if (options.saveEntry?.permission()) {
		// 	if (
		// 		(e.metaKey || e.ctrlKey) &&
		// 		// e.shiftKey &&
		// 		e.key.toLowerCase() === "enter"
		// 	) {
		// 		e.preventDefault();
		// 		options.saveEntry.callback();
		// 	}
		// }
	};

	onMount(() => {
		window.addEventListener("keydown", handleKeyDown);
	});

	onCleanup(() => {
		window.removeEventListener("keydown", handleKeyDown);
	});
};

export default useKeyboardShortcuts;
