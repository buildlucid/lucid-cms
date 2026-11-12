import { z } from "@lucidcms/core";
import { VARIANTS } from "./variants.ts";

/**
 * The environment the harness gives every setup's config. A setup's `env` is this schema, or the
 * values a Worker picks from it.
 */
export const harnessEnv = z.object({
	/** Where this setup's database lives, in the form its adapter expects. */
	HARNESS_DATABASE_URL: z.string(),
	/** The address the CMS is reached on. */
	HARNESS_URL: z.url().default("http://localhost:6543"),
	/** The schema step migration tests load the config with. See `shared/config/migrations/steps.ts`. */
	HARNESS_SCHEMA_STEP: z.string().optional(),
	/** Where the `outbox` fragment posts sent emails. */
	HARNESS_OUTBOX: z.url().optional(),
	/** Where probe jobs post what they did. */
	HARNESS_LEDGER: z.url().optional(),
	/** The harness's identity provider, which the `authentication` fragment's providers use. */
	HARNESS_IDP_URL: z.url().optional(),
	/** Lucid's own API, which the harness fakes so tests never reach Lucid's servers. Read by core. */
	LUCID_CMS_INTERNAL_REMOTE_API_URL_OVERRIDE: z.url().optional(),
	/** The variant of the config one test file runs with. See `variants.ts`. */
	HARNESS_VARIANT: z.enum(VARIANTS).optional(),
	/** The folder Node setups store uploads in. Host mode gives each CMS its own. */
	HARNESS_UPLOADS: z.string().optional(),
	/** The folder `seed:new` writes to and seed commands read project seeds from. Each migration database has its own. */
	HARNESS_SEEDS: z.string().optional(),
});

export type HarnessEnv = z.infer<typeof harnessEnv>;
