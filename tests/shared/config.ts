import { z } from "@lucidcms/core";
import type { EnvironmentVariables, LucidConfig } from "@lucidcms/core/types";
import PageCollection from "./collections/page.ts";
import RestrictedStoryCollection from "./collections/restricted-story.ts";
import ReviewedStoryCollection from "./collections/reviewed-story.ts";
import SettingsCollection from "./collections/settings.ts";
import StoryCollection from "./collections/story.ts";
import {
	generatedCollection,
	isGeneratedStep,
} from "./migrations/collections/generated.ts";
import steps, {
	type SchemaStep,
	type SchemaStepKey,
} from "./migrations/steps.ts";

/** A fixed secret for test servers only. */
const TEST_SECRET =
	"harness-only-secret-0123456789abcdefghijklmnopqrstuvwxyz01234567";

/** The header tests send their client address in, so each test session has its own rate limits. */
export const CLIENT_ADDRESS_HEADER = "x-harness-client-address";

/** Environment values the harness gives every Node setup. */
export const harnessEnv = z.object({
	/** Where this setup's database lives, in the form its adapter expects. */
	HARNESS_DATABASE_URL: z.string(),
	/** The address the CMS is reached on. */
	HARNESS_URL: z.url().default("http://localhost:6543"),
	/** The schema step migration tests load the config with. See `shared/migrations/steps.ts`. */
	HARNESS_SCHEMA_STEP: z.string().optional(),
	/** The folder the `outbox` fragment writes sent emails to. See `shared/fragments/outbox.ts`. */
	HARNESS_OUTBOX: z.string().optional(),
	/** The folder the `media` fragment stores uploads in. See `shared/fragments/media.ts`. */
	HARNESS_UPLOADS: z.string().optional(),
});

export type HarnessEnv = z.infer<typeof harnessEnv>;

/** Reads the database location for a setup's database adapter, which receives untyped values. */
export const getDatabaseUrl = (env: EnvironmentVariables): string =>
	harnessEnv.parse(env).HARNESS_DATABASE_URL;

/** The collections every setup registers. Setups may add their own on top. */
export const sharedCollections = [
	PageCollection,
	SettingsCollection,
	StoryCollection,
	ReviewedStoryCollection,
	RestrictedStoryCollection,
];

/**
 * Minimal shared config with optional features disabled. Setups add fragments and plugins to
 * enable the corresponding tests.
 */
export const sharedConfig = (options: { url: string }) =>
	({
		url: options.url,
		logger: { level: "error" },
		telemetry: false,
		announcements: false,
		updateChecks: false,
		secrets: {
			encryption: TEST_SECRET,
			cookie: TEST_SECRET,
			refreshToken: TEST_SECRET,
			accessToken: TEST_SECRET,
		},
		http: {
			security: {
				proxy: { header: CLIENT_ADDRESS_HEADER },
			},
			//* every response reports its database queries, which tests and benchmarks read with `countQueries`
			serverTiming: true,
			//* the route list it serves is how permission tests find routes they don't cover
			openAPI: { enabled: true },
		},
		collections: sharedCollections,
	}) satisfies LucidConfig;

/**
 * Adds the schema step named in `HARNESS_SCHEMA_STEP` to a setup's config, for migration tests.
 * Without one the config is returned as it is, which is how every other test runs.
 */
export const withSchemaStep = <Config extends LucidConfig>(
	env: Pick<HarnessEnv, "HARNESS_SCHEMA_STEP">,
	config: Config,
): Config => {
	const key = env.HARNESS_SCHEMA_STEP;
	if (!key) {
		return config;
	}
	if (!isGeneratedStep(key) && !Object.hasOwn(steps, key)) {
		throw new Error(`No schema step is registered as "${key}".`);
	}

	const step: SchemaStep = isGeneratedStep(key)
		? { collections: [generatedCollection(key)] }
		: steps[key as SchemaStepKey];
	return {
		...config,
		collections: [...(config.collections ?? []), ...(step.collections ?? [])],
		migrations: [...(config.migrations ?? []), ...(step.migrations ?? [])],
		plugins: [...(config.plugins ?? []), ...(step.plugins ?? [])],
		sources: {
			...config.sources,
			migrations: [
				...(config.sources?.migrations ?? []),
				...(step.sources?.migrations ?? []),
			],
		},
	};
};
