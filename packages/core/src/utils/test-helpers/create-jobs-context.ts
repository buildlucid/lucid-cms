import { createTranslationStore } from "../../libs/i18n/index.js";
import type { AnyJobDefinition } from "../../libs/jobs/types.js";
import type { QueueAdapterInstance } from "../../libs/queue/types.js";
import type { ResolvedLucidConfig } from "../../types/config.js";
import createServiceContext from "../services/create-service-context.js";
import type getTestConfig from "./get-test-config.js";

type TestConfig = ReturnType<typeof getTestConfig>;

/** Builds a service context whose job registry holds only the given jobs. */
export const createJobsContext = async (
	testConfig: TestConfig,
	options: { jobs: AnyJobDefinition[]; adapter: QueueAdapterInstance },
) => {
	const baseConfig = await testConfig.getConfig();
	const config: ResolvedLucidConfig = {
		...baseConfig,
		jobs: { ...baseConfig.jobs, definitions: options.jobs },
	};

	return createServiceContext({
		config,
		database: await testConfig.getDatabase(),
		translationStore: createTranslationStore({
			defaultLocale: "en",
			bundles: {},
		}),
		queue: options.adapter,
	});
};

/** Builds a queue adapter that records deliveries instead of sending them. */
export const createTestQueueAdapter = (
	publish: QueueAdapterInstance["publish"] = async () => ({
		error: undefined,
		data: undefined,
	}),
	key = "test-pull",
): QueueAdapterInstance => ({
	type: "queue-adapter",
	key,
	support: { delayedDelivery: true, maxDelayMs: null },
	publish,
});
