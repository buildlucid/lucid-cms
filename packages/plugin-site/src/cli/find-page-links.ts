import decode from "../utils/decode.js";
import normalizePath from "../utils/normalize-path.js";

const ANCHOR_HREF = /<a\b[^>]*?\shref\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;

/** Extracts decoded root-relative anchor paths without queries or fragments for comparison with decoded build and public file paths. */
const findPageLinks = (html: string): string[] => {
	const links = new Set<string>();
	for (const match of html.matchAll(ANCHOR_HREF)) {
		const href = (match[1] ?? match[2] ?? "").replaceAll("&amp;", "&");
		if (!href.startsWith("/") || href.startsWith("//")) continue;
		const target = href.split(/[?#]/, 1)[0] ?? "";
		if (target !== "") links.add(normalizePath(decode(target)));
	}
	return [...links];
};

export default findPageLinks;
