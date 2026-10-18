import { createPageMarkup } from "@lucidcms/client/markup";
import type { LucidHonoContext, Toolkit } from "@lucidcms/core/types";
import { getCookie } from "hono/cookie";
import { CLIENT_SCRIPT_PATH } from "../constants.js";
import type { SitePreview } from "../types.js";

/** Auth checks disable caching, so only previews request toolbar markup. */
const createSiteMarkup = async (props: {
	hono: LucidHonoContext;
	toolkit: Toolkit;
	preview: SitePreview | null;
}) => {
	const { hono, preview } = props;
	if (!preview) return { head: "", footer: "" };

	const authentication = await props.toolkit.auth.status({
		cookies: { get: (name) => getCookie(hono, name) },
		headers: { set: (name, value) => hono.header(name, value) },
	});

	return createPageMarkup({
		scriptSrc: `/${CLIENT_SCRIPT_PATH}`,
		authentication,
		preview: { data: preview },
		document: {
			data: {
				document: {
					collectionKey: preview.entry.collectionKey,
					id: preview.entry.documentId,
					version: preview.entry.version,
					meta: { versionId: preview.entry.versionId },
				},
			},
		},
	});
};

export default createSiteMarkup;
