import { produce } from "immer";
import type { Config, LucidConfig } from "../../../types/config.js";
import normalizeSecrets from "../normalize-secrets.js";

const BUILD_MODE_ROOT_SECRET = "0".repeat(64);

const normalizeConfigSecrets = (
	configValue: Config,
	mode?: "runtime" | "build",
): Config =>
	produce(configValue, (draft) => {
		if (
			mode === "build" &&
			(draft as unknown as Partial<LucidConfig>).secrets === undefined
		) {
			// Build runners may load config before runtime-only secrets exist.
			// Use a deterministic placeholder only to satisfy build-time validation.
			(draft as unknown as Partial<LucidConfig>).secrets =
				BUILD_MODE_ROOT_SECRET;
		}

		draft.secrets = normalizeSecrets((draft as unknown as LucidConfig).secrets);
	});

export default normalizeConfigSecrets;
