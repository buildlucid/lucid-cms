import path from "node:path";
import type { InlineConfig, LogLevel } from "vite";
import lucid from "../../vite/lucid.js";
import type { LucidViteOptions } from "../../vite/types.js";
import createViteLogger from "./create-vite-logger.js";

/** Returns the complete `lucid()` config without loading `vite.config.*`, rejecting projects served by a declared host. */
const createViteConfig = (
	options: Pick<
		LucidViteOptions,
		"remote" | "prepare" | "preview" | "admin"
	> & {
		configPath: string;
		/** Vite's mode, which the project's env loads for too, such as `production` for builds. */
		mode: string;
		/** The level of Vite's own messages. */
		logLevel?: LogLevel;
	},
): InlineConfig => ({
	root: path.dirname(options.configPath),
	configFile: false,
	mode: options.mode,
	// Vite's build reporter reads the level from the config rather than the logger.
	logLevel: options.logLevel,
	customLogger: createViteLogger(options.logLevel),
	plugins: [
		lucid({
			configPath: options.configPath,
			remote: options.remote,
			prepare: options.prepare,
			preview: options.preview,
			admin: options.admin,
			mode: options.mode,
		}),
	],
});

export default createViteConfig;
