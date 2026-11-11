import { defineConfig } from "@lucidcms/core";
import { node } from "@lucidcms/node";
import { pages } from "@lucidcms/pages";
import { postgres } from "@lucidcms/postgres";
import {
	getDatabaseUrl,
	harnessEnv,
	sharedCollections,
	sharedConfig,
	withSchemaStep,
} from "../../shared/config.ts";
import {
	ArticleCollection,
	localization,
} from "../../shared/fragments/localization.ts";
import { media } from "../../shared/fragments/media.ts";
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
			email: outbox(env.HARNESS_OUTBOX),
			localization,
			collections: [
				...sharedCollections,
				ArticleCollection,
				LandingPageCollection,
			],
			plugins: [
				media(env.HARNESS_UPLOADS),
				pages({ collections: [{ key: LandingPageCollection.key }] }),
			],
		}),
});
