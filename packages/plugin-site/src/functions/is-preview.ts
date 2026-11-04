import { type RenderInfo, withRender } from "@lucidkiln/core";
import type { SiteState } from "../types.js";

/** Whether the page renders for a preview, rather than the live site. */
const isPreview = withRender(
	(render: RenderInfo<SiteState>) => render.state.preview !== null,
);

export default isPreview;
