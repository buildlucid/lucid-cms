import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { normalizePath } from "vite";

const isScript = (file: string) => /\.m?js$/.test(file);

/** Adds assets named by listed scripts, recursively including worker bundles, chunks and WASM that Vite emits outside its manifest. */
const addReferencedFiles = async (props: {
	/** The client build's output folder. */
	outDir: string;
	/** The build's assets folder, relative to `outDir`, such as `_assets`. */
	assetsDir: string;
	/** Files relative to `outDir`, which gains the files they name. */
	files: Set<string>;
}) => {
	const pending = [...props.files].filter(isScript);
	// Without scripts there's nothing to name other files, and the assets folder may not exist.
	if (pending.length === 0) return;

	const directory = path.join(props.outDir, props.assetsDir);
	const candidates = (
		await readdir(directory, { recursive: true, withFileTypes: true })
	)
		.filter((entry) => entry.isFile())
		.map((entry) =>
			normalizePath(
				path.relative(props.outDir, path.join(entry.parentPath, entry.name)),
			),
		);

	for (let file = pending.pop(); file !== undefined; file = pending.pop()) {
		const code = await readFile(path.join(props.outDir, file), "utf8");
		for (const candidate of candidates) {
			if (
				props.files.has(candidate) ||
				!code.includes(path.posix.basename(candidate))
			) {
				continue;
			}

			props.files.add(candidate);
			if (isScript(candidate)) pending.push(candidate);
		}
	}
};

export default addReferencedFiles;
