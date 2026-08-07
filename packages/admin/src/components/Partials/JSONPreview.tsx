import { json } from "@codemirror/lang-json";
import { Compartment } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { createCodeMirror, createEditorReadonly } from "solid-codemirror";
import { type Component, createEffect } from "solid-js";
import themeStore from "@/store/themeStore";
import { getCodeMirrorTheme } from "@/utils/codemirror-theme";

interface JSONPreviewProps {
	title: string;
	json: Record<string, unknown>;
}

const JSONPreview: Component<JSONPreviewProps> = (props) => {
	// ----------------------------------------
	// CodeMirror
	const {
		ref: editorRef,
		editorView,
		createExtension,
	} = createCodeMirror({
		value: JSON.stringify(props.json, null, 2),
	});

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
