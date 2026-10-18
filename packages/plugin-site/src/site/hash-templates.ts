import type { Loader } from "@lucidkiln/core";
import sha256 from "../utils/sha256.js";

const hashTemplates = async (loader: Loader, names: Iterable<string>) => {
	const sources = await Promise.all(
		[...names].sort().map(async (name) => {
			const template = await loader.load(name);
			const source =
				typeof template === "string" ? template : (template?.source ?? "");
			return `${name}\n${source}`;
		}),
	);
	return (await sha256(sources.join("\0"))).slice(0, 16);
};

export default hashTemplates;
