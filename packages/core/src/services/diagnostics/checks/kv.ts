import cacheKeys from "../../../libs/kv/cache-keys.js";
import type { DiagnosticCheckStep } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import runStep from "../helpers/run-step.js";
import type { DiagnosticCheckOutcome } from "./types.js";

/** Writes a short-lived probe key, reads it back and deletes it. Skipped for the passthrough adapter, which never stores anything. */
const kvCheck: ServiceFn<[], DiagnosticCheckOutcome> = async (context) => {
	const kv = context.kv;
	if (kv.key === "passthrough") {
		return {
			error: undefined,
			data: {
				adapter: kv.key,
				steps: [],
				skipped: context.translate(
					"server:core.diagnostics.checks.kv.passthrough",
				),
			},
		};
	}

	const token = crypto.randomUUID();
	const key = cacheKeys.diagnostics.probe(token);
	const steps: DiagnosticCheckStep[] = [];

	const write = await runStep("write", () =>
		//* 60 seconds is the shortest TTL some providers, such as Cloudflare KV, accept
		kv.set(context, { key, value: token, ttlSeconds: 60 }),
	);
	steps.push(write);

	if (write.error === null) {
		steps.push(
			await runStep("read", async () => {
				const value = await kv.get<string>(context, { key });
				if (value !== token) {
					throw new Error(
						context.translate("server:core.diagnostics.checks.kv.mismatch"),
					);
				}
			}),
			await runStep("delete", () => kv.delete(context, { key })),
		);
	}

	return { error: undefined, data: { adapter: kv.key, steps } };
};

export default kvCheck;
