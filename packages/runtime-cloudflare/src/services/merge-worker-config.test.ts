import type { WorkerConfig } from "@cloudflare/vite-plugin";
import { expect, test } from "vitest";
import { DEFAULT_COMPATIBILITY_DATE } from "../constants.js";
import createWorkerConfig from "./create-worker-config.js";
import mergeWorkerConfig from "./merge-worker-config.js";

test("keeps the Worker's own settings and connects its Lucid bindings for --remote", () => {
	const worker: WorkerConfig = {
		name: "my-site",
		compatibilityDate: DEFAULT_COMPATIBILITY_DATE,
		entrypoint: "src/worker.ts",
		compatibilityFlags: ["nodejs_als"],
		observability: { enabled: true },
		env: {
			LUCID_KV: { type: "kv", id: "my-kv" },
			OTHER_KV: { type: "kv", id: "other" },
		},
		triggers: [{ type: "scheduled", schedule: "0 0 * * *" }],
	};
	const lucid = createWorkerConfig({
		name: worker.name,
		compatibilityDate: worker.compatibilityDate,
		entrypoint: "virtual:lucid/cloudflare-worker",
		role: "primary",
		options: { bindings: { kv: true } },
		artifacts: [],
		secrets: [],
		remote: true,
		worker,
	});

	const config = mergeWorkerConfig(worker, lucid);

	expect(config).toMatchObject({
		entrypoint: "virtual:lucid/cloudflare-worker",
		observability: { enabled: true },
		compatibilityFlags: ["nodejs_compat", "nodejs_als"],
		exports: lucid.exports,
		triggers: [...(lucid.triggers ?? []), ...(worker.triggers ?? [])],
	});
	expect(config.env).toEqual({
		...lucid.env,
		LUCID_KV: { type: "kv", id: "my-kv", dev: { remote: true } },
		OTHER_KV: { type: "kv", id: "other" },
	});
});
