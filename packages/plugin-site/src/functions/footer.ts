import { type RenderInfo, safe, withRender } from "@lucidkiln/core";
import { pageMarkup } from "../preview/page-markup.js";
import type { SiteState } from "../types.js";

const footer = withRender((render: RenderInfo<SiteState>) => {
	const markup = pageMarkup.get(render.state);
	if (!markup || markup.footerWritten) return "";

	markup.footerWritten = true;
	return safe(markup.footer);
});

export default footer;
