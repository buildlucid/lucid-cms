import { getPreviewTarget, previewFieldMarkup } from "@lucidcms/client/markup";
import { type RenderInfo, safe, withRender } from "@lucidkiln/core";
import type { SiteState } from "../types.js";

/** Preview attributes for a field of a document, brick, section or repeater item, or for a brick itself without a field. */
const editable = withRender(
	(render: RenderInfo<SiteState>, source: unknown, field?: string) => {
		if (render.state.preview === null) return "";
		return safe(previewFieldMarkup(getPreviewTarget(source, field)));
	},
);

export default editable;
