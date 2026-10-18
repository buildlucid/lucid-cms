import type { ServiceContext } from "@lucidcms/core/types";
import { deferIslands } from "@lucidkiln/core";
import { ISLANDS_URL, storeKeys } from "../constants.js";
import trackContentReads from "../engine/track-content-reads.js";
import type { SitePage, SiteState } from "../types.js";
import type { Site } from "./create-site-loader.js";
import type { StoredPage } from "./read-stored-page.js";
import saveStoredPage from "./save-stored-page.js";

const renderStoredPage = async (props: {
	context: ServiceContext;
	site: Site;
	page: SitePage;
	params: Record<string, string>;
	state: SiteState;
}): Promise<StoredPage> => {
	const tracked = trackContentReads(props.state.toolkit, props.context);
	const islands = deferIslands({ url: ISLANDS_URL });

	const body = await props.site.freshKiln.render(
		props.page.template,
		{ route: { path: props.state.path, params: props.params } },
		{ state: { ...props.state, toolkit: tracked.toolkit }, islands },
	);
	const stored: StoredPage = {
		body,
		contentType: props.page.contentType,
		tokens: await tracked.tokens(),
	};

	await saveStoredPage({
		context: props.context,
		key: storeKeys.page(props.site.version, props.state.path),
		page: stored,
		islands: islands.manifest,
		revalidate: props.page.revalidate,
	});
	return stored;
};

export default renderStoredPage;
