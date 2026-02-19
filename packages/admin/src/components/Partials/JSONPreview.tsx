import { json } from "@codemirror/lang-json";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { createCodeMirror, createEditorReadonly } from "solid-codemirror";
import type { Component } from "solid-js";
import { cmHighlighting, cmTheme } from "@/utils/codemirror-json-theme";

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

	createExtension(basicSetup);
	createExtension(json());
	createExtension(cmTheme);
	createExtension(cmHighlighting);
	createExtension(EditorView.lineWrapping);
	createExtension(
		EditorView.theme({
			".cm-cursor": { display: "none !important" },
		}),
	);

	// ----------------------------------------
	// Render
	return <div ref={editorRef} class="overflow-hidden rounded-md" />;
};

export default JSONPreview;
