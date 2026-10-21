import type { Loader } from "@lucidkiln/core";
import sha256 from "../utils/sha256.js";

/** Hashes the templates with the site's translations, since cached fragments hold translated text. */
const hashTemplates = async (
	loader: Loader,
	names: Iterable<string>,
	translations: Record<string, Record<string, string>>,
) => {
	const sources = await Promise.all(
		[...names].sort().map(async (name) => {
			const template = await loader.load(name);
			const source =
				typeof template === "string"
					? template
					: template && "source" in template
						? template.source
						: "";
			return `${name}\n${source}`;
		}),
	);
	sources.push(JSON.stringify(translations));
	return (await sha256(sources.join("\0"))).slice(0, 16);
};

export default hashTemplates;
