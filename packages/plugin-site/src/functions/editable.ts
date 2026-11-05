import { editable as clientEditable } from "@lucidcms/client/preview";
import { type RenderInfo, safe, withRender } from "@lucidkiln/core";
import type { SiteState } from "../types.js";

/** Marks the element that renders a field of a document, brick or repeater item, or the brick or item itself without a field. */
const editable = withRender(
	(render: RenderInfo<SiteState>, source: unknown, field?: string) => {
		if (render.state.preview === null) return "";
		return safe(String(clientEditable(source, field)));
	},
);

export default editable;
