import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const getDirName = (metaUrl: string) => {
	return dirname(fileURLToPath(metaUrl));
};

export default getDirName;
