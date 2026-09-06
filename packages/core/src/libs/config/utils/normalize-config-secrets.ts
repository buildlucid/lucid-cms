import type { LucidConfig } from "../../../types/config.js";
import normalizeSecrets from "../normalize-secrets.js";

const BUILD_MODE_ROOT_SECRET = "0".repeat(64);

const normalizeConfigSecrets = <T extends Partial<LucidConfig>>(
	config: T,
	mode?: "runtime" | "build",
) => ({
	...config,
	secrets: normalizeSecrets(
		mode === "build" && config.secrets === undefined
			? BUILD_MODE_ROOT_SECRET
			: config.secrets,
	),
});

export default normalizeConfigSecrets;
