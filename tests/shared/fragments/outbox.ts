import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { copy } from "@lucidcms/core";
import type { EmailAdapterInstance, LucidConfig } from "@lucidcms/core/types";

/** The adapter's key, which the harness reads `harness:outbox` from. */
export const OUTBOX_ADAPTER_KEY = "harness-outbox";

/** One email the CMS sent, as the outbox keeps it. */
export type OutboxEmail = {
	to: string;
	subject: string;
	template: string;
	/** What the template was rendered with, including links the CMS never stores. */
	data: Record<string, unknown>;
};

/**
 * Stores emails as JSON for tests. Node setups register it as `email` using `HARNESS_OUTBOX`;
 * without a directory, emails are discarded.
 */
export const outbox = (directory: string | undefined) =>
	({
		adapter: {
			type: "email-adapter",
			key: OUTBOX_ADAPTER_KEY,
			send: async (_context, params) => {
				if (directory) {
					const email: OutboxEmail = {
						to: params.to,
						subject: params.subject,
						template: params.template,
						data: params.data,
					};
					await mkdir(directory, { recursive: true });
					await writeFile(
						path.join(directory, `${Date.now()}-${randomUUID()}.json`),
						JSON.stringify(email),
					);
				}
				return {
					success: true,
					deliveryStatus: "sent",
					message: copy("server:core.email.successfully.sent"),
					data: null,
					externalMessageId: null,
				};
			},
		} satisfies EmailAdapterInstance,
	}) satisfies LucidConfig["email"];
