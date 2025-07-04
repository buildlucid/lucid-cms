import fs from "node:fs/promises";
import path from "node:path";
import { getDirName } from "../../../utils/helpers/index.js";
import type { Config } from "../../../types.js";

const currentDir = getDirName(import.meta.url);

const copyStaticAssets = async (config: Config) => {
	const assetsPath = path.join(currentDir, "../../../static");

	const outDir = path.join(config.compilerOptions.outDir);

	await fs.mkdir(outDir, { recursive: true });

	const assets = await fs.readdir(assetsPath);

	for (const asset of assets) {
		const assetPath = path.join(assetsPath, asset);
		const outPath = path.join(outDir, asset);
		await fs.copyFile(assetPath, outPath);
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default copyStaticAssets;
