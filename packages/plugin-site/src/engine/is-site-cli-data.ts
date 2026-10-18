import type { SiteCliData } from "../types.js";
import isRecord from "../utils/is-record.js";

/** Checks the plugin data the site's CLI module hands the runtime. */
const isSiteCliData = (value: unknown): value is SiteCliData =>
	isRecord(value) &&
	((value.mode === "dev" &&
		typeof value.directory === "string" &&
		typeof value.vite === "boolean") ||
		(value.mode === "build" &&
			isRecord(value.templates) &&
			(value.manifest === null || isRecord(value.manifest))));

export default isSiteCliData;
