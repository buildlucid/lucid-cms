import { defineSiteFunction } from "@lucidcms/plugin-site";

/** Waits up to three seconds and outputs nothing, so the islands lab can show a slow island's fallback. */
const wait = defineSiteFunction(
	async (_context, milliseconds: number) =>
		new Promise<string>((resolve) =>
			setTimeout(() => resolve(""), Math.min(milliseconds, 3000)),
		),
);

export default wait;
