//* scheme optional, so bare mentions such as "example.com/pricing" count too
const urlPattern =
	/(?:https?:\/\/)?(?:[a-z0-9-]+\.)+[a-z][a-z0-9-]{1,62}(?:[/?#][^\s"'<>`)\]}\\]*)?/gi;

/**
 * Identifies a webpage for comparison, ignoring the scheme, `www.`, a trailing
 * slash and the fragment. The query string must match exactly, since it is
 * where copied data would be added.
 */
export const webUrlKey = (value: string) => {
	try {
		const url = new URL(
			/^https?:\/\//i.test(value) ? value : `https://${value}`,
		);
		const host = url.hostname.replace(/^www\./, "");
		return `${host}${url.pathname.replace(/\/+$/, "")}${url.search}`;
	} catch {
		return undefined;
	}
};

export const addWebUrlKeys = (keys: Set<string>, text: string) => {
	for (const [match] of text.matchAll(urlPattern)) {
		const key = webUrlKey(match.replace(/[.,;:!?]+$/, ""));
		if (key) keys.add(key);
	}
	return keys;
};

/** Identifies a source for de-duplication, also ignoring tracking parameters. */
export const webSourceKey = (value: string) => {
	try {
		const url = new URL(value);
		for (const name of [...url.searchParams.keys()]) {
			if (/^(?:utm_|fbclid$|gclid$|mc_[ce]id$)/i.test(name))
				url.searchParams.delete(name);
		}
		return webUrlKey(url.toString());
	} catch {
		return undefined;
	}
};
