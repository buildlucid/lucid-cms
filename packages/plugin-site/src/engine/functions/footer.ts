import { type RenderInfo, safe, withRender } from "@lucidkiln/core";
import type { SiteState } from "../../types.js";
import { pageMarkup } from "../page-markup.js";

const footer = withRender((render: RenderInfo<SiteState>) => {
	const markup = pageMarkup.get(render.state);
	if (!markup || markup.footerWritten) return "";

	markup.footerWritten = true;
	return safe(markup.footer);
});

export default footer;
