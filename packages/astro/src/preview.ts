import type { AstroCookies } from "astro";
import getToolkit from "./toolkit.js";
import type { LucidAstroContext } from "./types.js";

type LucidAstroPreviewContext = LucidAstroContext & {
	url: URL;
	cookies: AstroCookies;
	/** A page's response, whose headers keep previews out of caches. */
	response?: { headers: Headers };
};

/**
 * Reads the preview a request asks for, in an Astro project using the Lucid integration. Pass
 * its `token` to toolkit reads; a navigable preview is kept in a cookie while its site is browsed.
 */
const getPreview = async (context: LucidAstroPreviewContext) => {
	const toolkit = await getToolkit(context);
	const { cookies, response } = context;
	return toolkit.previews.state({
		url: context.url,
		cookies: {
			get: (name) => cookies.get(name)?.value,
			set: (name, value, options) => cookies.set(name, value, options),
			delete: (name, options) => cookies.delete(name, options),
		},
		headers: response && {
			set: (name, value) => response.headers.set(name, value),
		},
	});
};

export default getPreview;
