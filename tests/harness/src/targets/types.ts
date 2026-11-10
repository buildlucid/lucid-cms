import type { createLucidHost } from "@lucidcms/core/runtime";
import type { Transport } from "../client/types.ts";

/** A CMS that tests can send requests to. */
export type Target = {
	/** The address its requests are made against. */
	url: string;
	transport: Transport;
	close(): Promise<void>;
};

export type HostTargetOptions = {
	/** Replaces adapters on an in-process CMS, such as a queue that fails on purpose. */
	adapterOverrides?: Parameters<typeof createLucidHost>[0]["adapterOverrides"];
};
