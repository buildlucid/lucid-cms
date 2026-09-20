import { json } from "@codemirror/lang-json";
import { Compartment } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";
import {
	createCodeMirror,
	createEditorControlledValue,
	createEditorReadonly,
} from "solid-codemirror";
import { type Component, createEffect, createMemo } from "solid-js";
import themeStore from "@/store/themeStore/themeStore";
import { getCodeMirrorTheme } from "@/utils/codemirror-theme";

interface JSONPreviewProps {
	json: Record<string, unknown>;
}

const JSONPreview: Component<JSONPreviewProps> = (props) => {
	// ----------------------------------------
	// CodeMirror
	const code = createMemo(() => JSON.stringify(props.json, null, 2));

	const {
		ref: editorRef,
		editorView,
		createExtension,
	} = createCodeMirror({
		value: code(),
	});

	//* the data these previews show arrives after mount, so it has to track it
	createEditorControlledValue(editorView, code);
	createEditorReadonly(editorView, () => true);
	const themeCompartment = new Compartment();

	createExtension(basicSetup);
	createExtension(json());
	createExtension(
		themeCompartment.of(getCodeMirrorTheme(themeStore.resolved())),
	);
	createExtension(EditorView.lineWrapping);
	createExtension(
		EditorView.theme({
			".cm-cursor": { display: "none !important" },
		}),
	);

	createEffect(() => {
		const view = editorView();
		const theme = themeStore.resolved();
		if (!view) return;

		view.dispatch({
			effects: themeCompartment.reconfigure(getCodeMirrorTheme(theme)),
		});
	});

	// ----------------------------------------
	// Render
	return <div ref={editorRef} class="overflow-hidden rounded-md" />;
};

export default JSONPreview;
