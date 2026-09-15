import { mergeExtensions, type RichTextJSON } from "@lucidcms/rich-text";
import type { Editor } from "@tiptap/core";
import {
	type Accessor,
	createEffect,
	createMemo,
	createSignal,
	on,
	onCleanup,
	untrack,
} from "solid-js";
import { createTiptapEditor } from "solid-tiptap";
import safeDeepEqual from "@/utils/safe-deep-equal";
import { handleEditorLinkClick } from "./link-events";
import { createRichTextNodeViewExtensions } from "./nodeViews";
import type { RichTextOptions } from "./types";

/**
 * Removes runtime handlers from the option shape used to decide whether an
 * editor needs rebuilding. The stable wrapper below keeps those handlers live.
 */
const getEditorSetupOptions = (options?: RichTextOptions) => {
	if (!options) return undefined;

	return {
		...options,
		callbacks: undefined,
		references: undefined,
		validation: undefined,
	};
};

/**
 * Keeps callback, reference, and validation lookups current without changing
 * the object identity consumed by Tiptap for otherwise-equivalent options.
 */
const getEditorOptions = (options: () => RichTextOptions | undefined) => {
	const current = options();
	if (!current) return undefined;

	return {
		...current,
		get callbacks() {
			return options()?.callbacks;
		},
		get references() {
			return options()?.references;
		},
		get validation() {
			return options()?.validation;
		},
	} satisfies RichTextOptions;
};

/** Builds the enabled Tiptap extension set for an editor instance. */
const getExtensions = (options?: RichTextOptions) =>
	mergeExtensions(createRichTextNodeViewExtensions(options)).filter(
		(extension) => {
			if (extension.name === "heading" && options?.headings === false)
				return false;
			if (extension.name === "underline" && options?.underline === false)
				return false;
			if (extension.name === "strike" && options?.strikethrough === false)
				return false;
			return true;
		},
	);

/** Creates and synchronizes the shared rich-text editor instance. */
const useEditor = (config: {
	value: RichTextJSON | null;
	onChange: (value: RichTextJSON) => void;
	disabled?: boolean;
	options?: RichTextOptions;
}): {
	editor: Accessor<Editor | undefined>;
	focused: Accessor<boolean>;
	setContainer: (el: HTMLDivElement) => void;
} => {
	// ----------------------------------------
	// State & Hooks
	const [focused, setFocused] = createSignal(false);
	const [container, setContainer] = createSignal<HTMLElement>();
	const editorOptions = createMemo(
		() => getEditorOptions(() => config.options),
		undefined,
		{
			equals: (previous, next) =>
				safeDeepEqual(
					getEditorSetupOptions(previous),
					getEditorSetupOptions(next),
				),
		},
	);

	const editor = createTiptapEditor(() => {
		// biome-ignore lint/style/noNonNullAssertion: Solid assigns the element ref before Tiptap's effect runs.
		const element = container()!;
		const options = editorOptions();

		return untrack(() => ({
			element,
			extensions: getExtensions(options),
			editorProps: {
				attributes: {
					class:
						options?.appearance === "seamless"
							? "rich-text-content min-h-[60vh] py-3 text-sm text-title focus:outline-none"
							: "rich-text-content min-h-48 p-3 text-sm text-title focus:outline-none",
				},
				handleDOMEvents: {
					click: (_view, event) => handleEditorLinkClick(container(), event),
				},
			},
			editable: !config.disabled,
			content: config.value,
			onUpdate: ({ editor: instance }) => {
				if (config.disabled) return;
				const value = instance.getJSON();
				config.onChange(value);
			},
			onFocus: () => setFocused(true),
			onBlur: () => setFocused(false),
		}));
	});

	// ----------------------------------------
	// Effects
	createEffect(
		on(
			() => config.value,
			(value) => {
				const instance = editor();
				if (!instance) return;
				if (safeDeepEqual(instance.getJSON(), value)) return;
				//* avoid resetting the document while the user is actively editing,
				//* which can move the caret to the end and create unexpected blocks.
				if (instance.isFocused) return;
				instance.commands.setContent(value, {
					emitUpdate: false,
				});
			},
		),
	);
	createEffect(
		on(
			() => config.disabled,
			(disabled) => {
				const instance = editor();
				if (!instance) return;
				instance.setEditable(!disabled);
			},
		),
	);

	// ----------------------------------------
	// Cleanup
	onCleanup(() => {
		const instance = editor();
		if (instance) {
			instance.destroy();
		}
	});

	// ----------------------------------------
	// Return
	return {
		editor,
		focused,
		setContainer,
	};
};

export default useEditor;
