import path from "node:path";

/** Matches imports that load from `node_modules`, leaving project files and Lucid's own modules in the bundle. */
const isPackageImport = (id: string) =>
	!(
		id.startsWith(".") ||
		id.startsWith("\0") ||
		id.startsWith("#") ||
		id.startsWith("lucid:") ||
		path.isAbsolute(id)
	);

export default isPackageImport;
