import path from "node:path";
import getConfig from "../../libs/config/get-config.js";
import { getDirName } from "../../utils/helpers/index.js";

const currentDir = getDirName(import.meta.url);

const getBasicConfig = (file: string) => async () => {
	const config = await getConfig({
		path: path.resolve(currentDir, "./config/", file),
	});

	return config;
};

//* Note when using this, as config is stored globally in memory, when you fetch another config it will overwrite the previous one
const testConfig = {
	basic: getBasicConfig("lucid.config.ts"),
};

export default testConfig;
