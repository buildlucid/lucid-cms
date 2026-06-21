import path from "node:path";

const toDisplayPath = (filePath: string) =>
	`/${path.relative(process.cwd(), filePath).split(path.sep).join("/")}`;

export default toDisplayPath;
