import type { HttpExtensionRegister } from "@lucidcms/core/types";
import { ASSETS_BASE, IMMUTABLE_CACHE_CONTROL } from "../constants.js";
import readCliData from "../site/read-cli-data.js";
import listBuiltFiles from "./list-built-files.js";

/** Wraps public file serving before middleware so built assets receive browser caching headers. */
const registerAssetHeaders: HttpExtensionRegister = (app) => {
	app.use(`${ASSETS_BASE}*`, async (c, next) => {
		await next();

		const data = readCliData(c.get("runtimeContext"));
		if (c.res.status !== 200 || data?.kind !== "build" || !data.manifest) {
			return;
		}
		if (
			listBuiltFiles(data.manifest).has(c.req.path.slice(ASSETS_BASE.length))
		) {
			c.res.headers.set("cache-control", IMMUTABLE_CACHE_CONTROL);
		}
	});
};

export default registerAssetHeaders;
