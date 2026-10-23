import path from "node:path";

/** Names client inputs with `site-` (for example, `styles/site.css` becomes `site-styles-site`), numbering collisions such as `foo-bar.ts` and `foo/bar.ts` to keep names unique and separate from inputs such as `lucid-admin`. */
const entryInputs = (root: string, entries: string[]) => {
	const inputs: Record<string, string> = {};

	for (const entry of entries) {
		const base = `site-${entry.replace(/\.[^./]+$/, "").replaceAll("/", "-")}`;
		let name = base;
		for (let count = 2; name in inputs; count++) {
			name = `${base}-${count}`;
		}

		inputs[name] = path.resolve(root, entry);
	}

	return inputs;
};

export default entryInputs;
