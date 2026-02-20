import type { Editor, JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import {
	type Accessor,
	createEffect,
	createSignal,
	on,
	onCleanup,
	untrack,
} from "solid-js";
import { createTiptapEditor } from "solid-tiptap";
import safeDeepEqual from "@/utils/safe-deep-equal";

const useEditor = (config: {
	value: JSONContent | null;
	onChange: (value: JSONContent) => void;
	disabled?: boolean;
}): {
	editor: Accessor<Editor | undefined>;
	focused: Accessor<boolean>;
	setContainer: (el: HTMLDivElement) => void;
} => {
	// ----------------------------------------
	// State & Hooks
	const [focused, setFocused] = createSignal(false);
	const [container, setContainer] = createSignal<HTMLElement>();

	const editor = createTiptapEditor(() => ({
		// biome-ignore lint/style/noNonNullAssertion: container is guaranteed to exist
		element: container()!,
		extensions: [
			StarterKit.configure({
				link: {
					openOnClick: true,
				},
			}),
		],
		editorProps: {
			attributes: {
				class:
					"wysiwyg-content min-h-48 p-3 text-sm text-title focus:outline-none",
			},
		},
		editable: untrack(() => !config.disabled),
		content: untrack(() => config.value),
		onUpdate: ({ editor: instance }) => {
			if (config.disabled) return;
			config.onChange(instance.getJSON());
		},
		onFocus: () => setFocused(true),
		onBlur: () => setFocused(false),
	}));

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
