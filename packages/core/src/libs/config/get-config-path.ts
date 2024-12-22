import T from "../../translations/index.js";
import path from "node:path";
import fs from "node:fs";

const getConfigPath = (cwd: string, filename?: string): string => {
	let configPath: string | undefined = undefined;
	const root = path.parse(cwd).root;
	const configFileName = filename ?? "lucid.config";
	const configExtensions = [".ts", ".js", ".mjs", ".mts"];

	const search = (cwd: string): void => {
		const files = fs.readdirSync(cwd);
		const configFiles = files.filter((file) => {
			const { name, ext } = path.parse(file);
			return name === configFileName && configExtensions.includes(ext);
		});

		if (configFiles.length > 0 && configFiles[0]) {
			configPath = path.resolve(cwd, configFiles[0]);
			return;
		}

		const parent = path.resolve(cwd, "..");
		if (parent === cwd || parent === root) {
			return;
		}

		search(parent);
	};
	search(cwd);

	if (!configPath) {
		throw new Error(T("cannot_find_config_path"));
	}

	return configPath;
};

export default getConfigPath;
