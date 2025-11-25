import { unlink } from "node:fs/promises";

const cleanupTempFiles = async (files: string[]): Promise<void> => {
	await Promise.all(files.map((file) => unlink(file)));
};

export default cleanupTempFiles;
