import { previewParams } from "@lucidcms/client/contract";
import type { LucidHonoContext, Toolkit } from "@lucidcms/core/types";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import type { SitePreview } from "../types.js";
import createPreviewErrorPage from "./create-preview-error-page.js";

const readPreview = async (props: {
	hono: LucidHonoContext;
	toolkit: Toolkit;
}): Promise<{ preview: SitePreview | null } | { response: Response }> => {
	const { hono } = props;
	const result = await props.toolkit.previews.state({
		url: hono.req.url,
		cookies: {
			get: (name) => getCookie(hono, name),
			set: (name, value, options) => setCookie(hono, name, value, options),
			delete: (name, options) => {
				deleteCookie(hono, name, options);
			},
		},
		headers: { set: (name, value) => hono.header(name, value) },
	});

	if (result.error) {
		return { response: hono.html(createPreviewErrorPage(), 401) };
	}
	if (result.data.kind === "published" && result.data.source === "exit") {
		const url = new URL(hono.req.url);
		url.searchParams.delete(previewParams.token);
		return { response: hono.redirect(`${url.pathname}${url.search}`, 302) };
	}
	return { preview: result.data.kind === "preview" ? result.data : null };
};

export default readPreview;
