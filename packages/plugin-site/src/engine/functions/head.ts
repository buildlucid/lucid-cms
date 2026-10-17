import { type RenderInfo, safe, withRender } from "@lucidkiln/core";
import type { SiteState } from "../../types.js";
import { pageMarkup } from "../page-markup.js";

const head = withRender((render: RenderInfo<SiteState>) =>
	safe(pageMarkup.get(render.state)?.head ?? ""),
);

export default head;
