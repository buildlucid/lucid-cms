import { Compartment } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { type Accessor, createEffect } from "solid-js";
import themeStore from "@/store/themeStore/themeStore";
import { getCodeMirrorTheme } from "@/utils/codemirror-theme";
import { loadCodeLanguageExtension } from "./code-field-languages";

/**
 * Gives a CodeMirror view the admin's theme and a language's highlighting, following both as
 * they change. Shared by the editor and the read-only code block.
 */
const createCodeAppearance = (props: {
	editorView: Accessor<EditorView | undefined>;
	createExtension: (extension: Extension) => unknown;
	language: Accessor<string>;
}) => {
	const languageCompartment = new Compartment();
	const themeCompartment = new Compartment();
	props.createExtension(languageCompartment.of([]));
	props.createExtension(
		themeCompartment.of(getCodeMirrorTheme(themeStore.resolved())),
	);

	//* languages load on demand, so a slower load for a language no longer shown is dropped
	let languageLoadId = 0;
	createEffect(() => {
		const view = props.editorView();
		const language = props.language();
		if (!view) return;

		const loadId = ++languageLoadId;
		loadCodeLanguageExtension(language)
			.then((extension) => {
				if (loadId !== languageLoadId) return;
				view.dispatch({
					effects: languageCompartment.reconfigure(extension ?? []),
				});
			})
			.catch(() => {
				if (loadId !== languageLoadId) return;
				view.dispatch({ effects: languageCompartment.reconfigure([]) });
			});
	});
	createEffect(() => {
		const view = props.editorView();
		const theme = themeStore.resolved();
		if (!view) return;

		view.dispatch({
			effects: themeCompartment.reconfigure(getCodeMirrorTheme(theme)),
		});
	});
};

export default createCodeAppearance;
