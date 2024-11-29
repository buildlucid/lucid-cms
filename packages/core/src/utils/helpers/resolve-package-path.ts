import { dirname } from "node:path";

const resolvePackagePath = (name: string) => {
	try {
		const packagePath = require.resolve(`${name}/package.json`);
		return dirname(packagePath);
	} catch (err) {
		// console.warn(`Could not resolve ${name}, falling back to node_modules`);
		return name;
	}
};

export default resolvePackagePath;
