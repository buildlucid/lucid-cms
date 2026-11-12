import type { EnvironmentVariables, LucidConfig } from "@lucidcms/core/types";
import {
	CLIENT_ADDRESS_HEADER,
	type HarnessEnv,
	harnessEnv,
} from "#harness/config";
import PageCollection from "./collections/page.ts";
import RestrictedStoryCollection from "./collections/restricted-story.ts";
import ReviewedStoryCollection from "./collections/reviewed-story.ts";
import SettingsCollection from "./collections/settings.ts";
import StagedStoryCollection from "./collections/staged-story.ts";
import StoryCollection from "./collections/story.ts";
import TeamStoryCollection from "./collections/team-story.ts";
import { aiCollections, aiConfig } from "./fragments/ai.ts";
import { authentication } from "./fragments/auth.ts";
import { harnessJobs } from "./fragments/jobs.ts";
import { mediaConfig } from "./fragments/media.ts";
import { outbox } from "./fragments/outbox.ts";

/** A fixed secret for test servers only. */
const TEST_SECRET =
	"harness-only-secret-0123456789abcdefghijklmnopqrstuvwxyz01234567";

/** Reads the database location for a setup's database adapter, which receives untyped values. */
export const getDatabaseUrl = (env: EnvironmentVariables): string =>
	harnessEnv.parse(env).HARNESS_DATABASE_URL;

/** The collections every setup registers. Setups may add their own on top. */
const sharedCollections = [
	PageCollection,
	SettingsCollection,
	StoryCollection,
	ReviewedStoryCollection,
	TeamStoryCollection,
	StagedStoryCollection,
	RestrictedStoryCollection,
];

/**
 * What every setup can do unless it goes without it. Each gives the capability that tests needing
 * it `requires()`, so a setup without one reports those tests as not applicable.
 * - `outbox`: emails go to the harness (`harness:outbox`), for `lucid.user()` and invitations, and magic links are on (`auth:magicLink`).
 * - `identityProvider`: two sign-in providers through the harness's identity provider (`harness:identityProvider`).
 * - `media`: media options, and on Node filesystem storage and Sharp (`feature:mediaStorage`, `plugin:filesystem`, `plugin:sharp`).
 * - `ai`: the harness agents, their routines and MCP tools, and the `brief` collection (`agent:harness`).
 * - `jobs`: probe jobs, schedules and routes (`plugin:harness-jobs`).
 */
export type Ability = "outbox" | "identityProvider" | "media" | "ai" | "jobs";

/** What a setup adds to the shared config, and the abilities it goes without. */
export type HarnessConfigOptions = Partial<LucidConfig> & {
	without?: readonly Ability[];
};

/**
 * The config every setup starts from: the shared collections and settings, with every ability
 * on unless `without` names it. `collections` and `plugins` are added to the shared ones, and
 * anything else given replaces the shared value, such as `localization`. Runtime-neutral, so a
 * Worker can bundle it. Node setups use `nodeHarnessConfig`, which adds what only Node can run.
 *
 * @example
 * ```ts
 * config: (env) =>
 * 	harnessConfig(env, {
 * 		without: ["ai"],
 * 		plugins: [cloudflareR2()],
 * 	}),
 * ```
 */
export const harnessConfig = (
	env: Partial<HarnessEnv> & Pick<HarnessEnv, "HARNESS_URL">,
	options: HarnessConfigOptions = {},
): LucidConfig => {
	const { without = [], collections = [], plugins = [], ...rest } = options;
	const has = (ability: Ability) => !without.includes(ability);

	return {
		url: env.HARNESS_URL,
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
		//* Lucid refuses magic links without an email adapter to send them
		...authentication(env, {
			magicLink: has("outbox"),
			providers: has("identityProvider"),
		}),
		...(has("media") && mediaConfig(env)),
		...(has("ai") && aiConfig(env)),
		...(has("outbox") && { email: outbox(env.HARNESS_OUTBOX) }),
		collections: [
			...sharedCollections,
			...(has("ai") ? aiCollections : []),
			...collections,
		],
		plugins: [
			...plugins,
			...(has("jobs") ? [harnessJobs(env.HARNESS_LEDGER)] : []),
		],
		...rest,
	};
};
