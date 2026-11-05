import { type RenderInfo, withRender } from "@lucidkiln/core";
import type { SiteState } from "../types.js";

/** Whether the page renders in the builder's preview, where editors fill in what's on it. */
const isEditing = withRender(
	(render: RenderInfo<SiteState>) => render.state.preview?.builder === true,
);

export default isEditing;
