import type { Component } from "solid-js";

interface JSONPreviewProps {
	title: string;
	json: Record<string, unknown>;
}

const JSONPreview: Component<JSONPreviewProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<pre class="text-xs text-title p-15 bg-container-2 rounded-md border border-border overflow-auto">
			{JSON.stringify(props.json, null, 2)}
		</pre>
	);
};

export default JSONPreview;
