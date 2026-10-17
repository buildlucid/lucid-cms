import type {
	LucidHonoContext,
	ServiceContext,
	Toolkit,
} from "@lucidcms/core/types";
import type { IslandEntry } from "@lucidkiln/core";
import { storeKeys } from "../constants.js";
import type { SiteState } from "../types.js";
import type { Site } from "./create-site-loader.js";

const renderIsland = async (props: {
	hono: LucidHonoContext;
	context: ServiceContext;
	toolkit: Toolkit;
	site: Site;
	id: string;
}) => {
	const { hono, context } = props;
	const entry = await context.kv.get<IslandEntry>(context, {
		key: storeKeys.island(props.id),
		hash: true,
	});
	if (!entry) return hono.text("Not found", 404);

	const state: SiteState = {
		toolkit: props.toolkit,
		path: new URL(hono.req.url).pathname,
		preview: null,
		version: props.site.functions.getVersion,
	};
	const html = await props.site.kiln.render(entry.template, entry.props, {
		state,
	});
	return hono.html(html, 200, {
		"cache-control": "no-store",
		"x-robots-tag": "noindex",
	});
};

export default renderIsland;
