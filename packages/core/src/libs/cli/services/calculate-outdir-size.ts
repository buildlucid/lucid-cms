import fs from "node:fs/promises";
import path from "node:path";

const calculateOutDirSize = async (dirPath: string): Promise<number> => {
	let totalSize = 0;

	const calculateSize = async (currentPath: string): Promise<void> => {
		const stats = await fs.stat(currentPath);

		if (stats.isFile()) {
			totalSize += stats.size;
		} else if (stats.isDirectory()) {
			const entries = await fs.readdir(currentPath);
			await Promise.all(
				entries.map((entry) => calculateSize(path.join(currentPath, entry))),
			);
		}
	};

	await calculateSize(dirPath);
	return totalSize;
};

export default calculateOutDirSize;
