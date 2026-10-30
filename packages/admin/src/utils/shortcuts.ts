import type { Hotkey } from "@tanstack/solid-hotkeys";
import type { TranslationKeys } from "@/translations";

export type ShortcutGroup = "general" | "builder" | "agent";

export interface Shortcut {
	hotkey: Hotkey;
	label: TranslationKeys;
	group: ShortcutGroup;
}

/**
 * The admin's keyboard shortcuts, as the shortcuts modal lists them. Register them with `createHotkey`
 * and show them with `formatForDisplay`. Undo, redo, Escape and the agent composer's keys are handled
 * where they apply and are only listed here.
 */
export const shortcuts = {
	showShortcuts: {
		hotkey: "?",
		label: "shortcuts.show",
		group: "general",
	},
	newEntry: {
		hotkey: "Shift+T",
		label: "shortcuts.new.entry",
		group: "general",
	},
	nextLocale: {
		hotkey: "Mod+Shift+.",
		label: "shortcuts.locale.next",
		group: "general",
	},
	previousLocale: {
		hotkey: "Mod+Shift+,",
		label: "shortcuts.locale.previous",
		group: "general",
	},
	toggleAgentPanel: {
		hotkey: "Mod+J",
		label: "shortcuts.agent.panel",
		group: "general",
	},
	close: {
		hotkey: "Escape",
		label: "shortcuts.close",
		group: "general",
	},
	save: {
		hotkey: "Mod+S",
		label: "shortcuts.save",
		group: "builder",
	},
	togglePreview: {
		hotkey: "Mod+Shift+P",
		label: "shortcuts.preview",
		group: "builder",
	},
	undo: {
		hotkey: "Mod+Z",
		label: "shortcuts.undo",
		group: "builder",
	},
	redo: {
		hotkey: "Mod+Shift+Z",
		label: "shortcuts.redo",
		group: "builder",
	},
	agentSend: {
		hotkey: "Enter",
		label: "shortcuts.agent.send",
		group: "agent",
	},
	agentNewLine: {
		hotkey: "Shift+Enter",
		label: "shortcuts.agent.new.line",
		group: "agent",
	},
	agentSteer: {
		hotkey: "Mod+Enter",
		label: "shortcuts.agent.steer",
		group: "agent",
	},
} as const satisfies Record<string, Shortcut>;

/** Whether a dialog is open, so page shortcuts can step aside for it. */
export const inModal = () =>
	!!document.querySelector('[role="dialog"][data-expanded]');
