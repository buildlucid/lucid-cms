import type { createLucidHost } from "@lucidcms/core/runtime";
import type { Variant } from "../../../shared/variants.ts";
import type { Transport } from "../client/types.ts";

/** A CMS that tests can send requests to. */
export type Target = {
	/** The address its requests are made against. */
	url: string;
	transport: Transport;
	/** The folder holding the emails this CMS sent. */
	outbox: string;
	close(): Promise<void>;
};

export type HostTargetOptions = {
	/** Replaces adapters on an in-process CMS, such as a queue that fails on purpose. */
	adapterOverrides?: Parameters<typeof createLucidHost>[0]["adapterOverrides"];
	/** Runs the CMS with a variant of the setup's config. See `shared/variants.ts`. */
	variant?: Variant;
};
