import type { LucidHonoContext, Toolkit } from "@lucidcms/core/types";
import type { SitePreview } from "../types.js";
import createPreviewErrorPage from "./create-preview-error-page.js";
import createPreviewSession from "./create-preview-session.js";

const readPreview = async (props: {
	hono: LucidHonoContext;
	toolkit: Toolkit;
}): Promise<{ preview: SitePreview | null } | { response: Response }> => {
	const { hono } = props;
	const result = await props.toolkit.previews.state({
		url: hono.req.url,
		session: createPreviewSession(hono),
		headers: { set: (name, value) => hono.header(name, value) },
	});

	if (result.error) {
		return { response: hono.html(createPreviewErrorPage(), 401) };
	}
	if (result.data.kind === "published" && result.data.source === "exit") {
		const url = new URL(hono.req.url);
		url.searchParams.delete("preview");
		return { response: hono.redirect(`${url.pathname}${url.search}`, 302) };
	}
	return { preview: result.data.kind === "preview" ? result.data : null };
};

export default readPreview;
