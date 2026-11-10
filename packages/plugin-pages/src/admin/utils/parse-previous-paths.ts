import type { PreviousPath } from "../../schema/previous-paths.js";

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const isPreviousPath = (value: unknown): value is PreviousPath =>
	isRecord(value) &&
	typeof value.id === "number" &&
	typeof value.environment === "string" &&
	(value.locale === null || typeof value.locale === "string") &&
	typeof value.path === "string";

/** Reads the previous paths route's response. Throws when it isn't a list of paths. */
const parsePreviousPaths = (value: unknown): PreviousPath[] => {
	const paths = isRecord(value) ? value.data : undefined;
	if (!Array.isArray(paths) || !paths.every(isPreviousPath)) {
		throw new Error("The previous paths response isn't a list of paths.");
	}
	return paths;
};

export default parsePreviousPaths;
