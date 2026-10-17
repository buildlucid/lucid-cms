import { previewFieldMarkup } from "@lucidcms/client/markup";
import { type RenderInfo, safe, withRender } from "@lucidkiln/core";
import type { SiteState } from "../../types.js";
import { fieldTargets } from "../field-targets.js";

const editable = withRender(
	(render: RenderInfo<SiteState>, source: unknown, field: string) => {
		if (render.state.preview === null) return "";
		if (typeof source !== "object" || source === null) return "";

		const target = fieldTargets.get(source);
		if (!target) return "";

		return safe(
			previewFieldMarkup({ ...target, path: [...target.path, field] }),
		);
	},
);

export default editable;
