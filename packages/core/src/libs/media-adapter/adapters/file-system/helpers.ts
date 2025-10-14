import path from "node:path";
import T from "../../../../translations/index.js";

export const keyPaths = (key: string, uploadDir: string) => {
	// key example: 2024/01/gdfh4-banner
	const keyPath = key.split("/").slice(0, -1).join("/");
	const filename = key.split("/").pop();

	if (!filename) throw new Error(T("invalid_key"));

	const targetDir = path.join(uploadDir, keyPath);
	const targetPath = path.join(targetDir, filename);

	return {
		keyPath,
		filename,
		targetDir,
		targetPath,
	};
};
