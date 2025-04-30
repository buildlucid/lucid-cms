import { onMount, onCleanup } from "solid-js";
import isMac from "@/utils/is-mac";

const modKey = isMac() ? "⌘" : "Ctrl";

export const shortcutText = {
	changeLocale: `${modKey}+Shift+L`,
	newEntry: "Shift+T",
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
	// saveEntry?: {
	// 	permission: () => boolean;
	// 	callback: () => void;
	// };
}) => {
	const handleKeyDown = (e: KeyboardEvent) => {
		// change locale: meta/cntrl + shfit + l
		if (options.changeLocale?.permission()) {
			if (
				(e.metaKey || e.ctrlKey) &&
				e.shiftKey &&
				e.key.toLowerCase() === "l"
			) {
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
