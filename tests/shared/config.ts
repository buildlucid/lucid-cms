import { z } from "@lucidcms/core";
import type { EnvironmentVariables, LucidConfig } from "@lucidcms/core/types";
import PageCollection from "./collections/page.ts";
import RestrictedStoryCollection from "./collections/restricted-story.ts";
import ReviewedStoryCollection from "./collections/reviewed-story.ts";
import SettingsCollection from "./collections/settings.ts";
import StagedStoryCollection from "./collections/staged-story.ts";
import StoryCollection from "./collections/story.ts";
import TeamStoryCollection from "./collections/team-story.ts";
import {
	generatedCollection,
	isGeneratedStep,
} from "./migrations/collections/generated.ts";
import steps, {
	type SchemaStep,
	type SchemaStepKey,
} from "./migrations/steps.ts";
import { VARIANTS } from "./variants.ts";

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
	/** Where the `outbox` fragment posts sent emails. See `shared/fragments/outbox.ts`. */
	HARNESS_OUTBOX: z.url().optional(),
	/** Where probe jobs post what they did. See `shared/fragments/jobs.ts`. */
	HARNESS_LEDGER: z.url().optional(),
	/** The harness's identity provider, which the `authentication` fragment's providers use. */
	HARNESS_IDP_URL: z.url().optional(),
	/** Lucid's own API, which the harness fakes so tests never reach Lucid's servers. Read by core. */
	LUCID_CMS_INTERNAL_REMOTE_API_URL_OVERRIDE: z.url().optional(),
	/** The variant of the config one test file runs with. See `shared/variants.ts`. */
	HARNESS_VARIANT: z.enum(VARIANTS).optional(),
	/** The folder Node setups store uploads in. Host mode gives each CMS its own. See `shared/fragments/node-media.ts`. */
	HARNESS_UPLOADS: z.string().optional(),
	/** The folder `seed:new` writes to and seed commands read project seeds from. Each migration database has its own. */
	HARNESS_SEEDS: z.string().optional(),
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
	TeamStoryCollection,
	StagedStoryCollection,
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
 * Applies `HARNESS_SCHEMA_STEP` and `HARNESS_SEEDS` for migration and seed tests. Leaves config
 * unchanged when neither is set.
 */
export const withSchemaStep = <Config extends LucidConfig>(
	env: Pick<HarnessEnv, "HARNESS_SCHEMA_STEP" | "HARNESS_SEEDS">,
	config: Config,
): Config => {
	const seeded: Config = env.HARNESS_SEEDS
		? {
				...config,
				directories: { ...config.directories, seeds: env.HARNESS_SEEDS },
			}
		: config;
	const key = env.HARNESS_SCHEMA_STEP;
	if (!key) {
		return seeded;
	}
	if (!isGeneratedStep(key) && !Object.hasOwn(steps, key)) {
		throw new Error(`No schema step is registered as "${key}".`);
	}

	const step: SchemaStep = isGeneratedStep(key)
		? { collections: [generatedCollection(key)] }
		: steps[key as SchemaStepKey];
	return {
		...seeded,
		collections: [...(config.collections ?? []), ...(step.collections ?? [])],
		migrations: [...(config.migrations ?? []), ...(step.migrations ?? [])],
		plugins: [...(config.plugins ?? []), ...(step.plugins ?? [])],
		seeds: [...(config.seeds ?? []), ...(step.seeds ?? [])],
		sources: {
			...config.sources,
			migrations: [
				...(config.sources?.migrations ?? []),
				...(step.sources?.migrations ?? []),
			],
			seeds: [...(config.sources?.seeds ?? []), ...(step.sources?.seeds ?? [])],
		},
	};
};
