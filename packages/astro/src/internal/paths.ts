import path from "node:path";

/**
 * Astro, Vite and worker codegen all expect POSIX separators, so we normalize
 * once to avoid platform-specific path bugs leaking into generated modules.
 */
export const toPosixPath = (value: string): string =>
	value.split(path.sep).join("/");

/**
 * Generated files need stable relative imports because Astro materialises them
 * inside a codegen directory that is different from the app source tree.
 */
export const toImportPath = (fromDir: string, targetPath: string): string => {
	const relativePath = toPosixPath(path.relative(fromDir, targetPath));
	return relativePath.startsWith(".") ? relativePath : `./${relativePath}`;
};
