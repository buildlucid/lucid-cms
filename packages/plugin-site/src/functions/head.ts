import { type RenderInfo, safe, withRender } from "@lucidkiln/core";
import { pageMarkup } from "../preview/page-markup.js";
import type { SiteState } from "../types.js";

const head = withRender((render: RenderInfo<SiteState>) =>
	safe(pageMarkup.get(render.state)?.head ?? ""),
);

export default head;
