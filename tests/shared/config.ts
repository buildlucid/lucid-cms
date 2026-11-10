import { z } from "@lucidcms/core";
import type { EnvironmentVariables, LucidConfig } from "@lucidcms/core/types";
import PageCollection from "./collections/page.ts";
import SettingsCollection from "./collections/settings.ts";

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
});

export type HarnessEnv = z.infer<typeof harnessEnv>;

/** Reads the database location for a setup's database adapter, which receives untyped values. */
export const getDatabaseUrl = (env: EnvironmentVariables): string =>
	harnessEnv.parse(env).HARNESS_DATABASE_URL;

/** The collections every setup registers. Setups may add their own on top. */
export const sharedCollections = [PageCollection, SettingsCollection];

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
		},
		collections: sharedCollections,
	}) satisfies LucidConfig;
