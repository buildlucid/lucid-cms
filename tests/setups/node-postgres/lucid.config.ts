import { defineConfig } from "@lucidcms/core";
import { node } from "@lucidcms/node";
import { pages } from "@lucidcms/pages";
import { postgres } from "@lucidcms/postgres";
import { workerQueues } from "@lucidcms/worker-queues";
import {
	getDatabaseUrl,
	harnessEnv,
	sharedCollections,
	sharedConfig,
	withSchemaStep,
} from "../../shared/config.ts";
import { aiCollections, aiConfig } from "../../shared/fragments/ai.ts";
import { authentication } from "../../shared/fragments/auth.ts";
import { harnessJobs } from "../../shared/fragments/jobs.ts";
import {
	ArticleCollection,
	GuideCollection,
	localization,
} from "../../shared/fragments/localization.ts";
import { mediaConfig } from "../../shared/fragments/media.ts";
import { nodeMediaPlugins } from "../../shared/fragments/node-media.ts";
import { outbox } from "../../shared/fragments/outbox.ts";
import LandingPageCollection from "./collections/landing-page.ts";

export const env = harnessEnv;

export default defineConfig({
	env,
	runtime: node,
	db: postgres((env) => ({ url: getDatabaseUrl(env) })),
	config: (env) =>
		withSchemaStep(env, {
			...sharedConfig({ url: env.HARNESS_URL }),
			...authentication(env),
			...mediaConfig(env),
			...aiConfig(env),
			email: outbox(env.HARNESS_OUTBOX),
			localization,
			collections: [
				...sharedCollections,
				...aiCollections,
				ArticleCollection,
				GuideCollection,
				LandingPageCollection,
			],
			plugins: [
				...nodeMediaPlugins(env.HARNESS_UPLOADS),
				pages({ collections: [{ key: LandingPageCollection.key }] }),
				//* host mode runs a stand-in with the same key, as nothing is built to start the thread from
				workerQueues(),
				harnessJobs(env.HARNESS_LEDGER),
			],
		}),
});
