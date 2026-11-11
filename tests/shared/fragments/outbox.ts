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
 * Posts emails to the harness, which keeps them for tests. Every setup registers it as `email`
 * using `HARNESS_OUTBOX`, a URL, so it works on every runtime. Without one, emails are discarded.
 */
export const outbox = (url: string | undefined) =>
	({
		adapter: {
			type: "email-adapter",
			key: OUTBOX_ADAPTER_KEY,
			send: async (_context, params) => {
				if (url) {
					const email: OutboxEmail = {
						to: params.to,
						subject: params.subject,
						template: params.template,
						data: params.data,
					};
					const response = await fetch(url, {
						method: "POST",
						headers: { "content-type": "application/json" },
						body: JSON.stringify(email),
					});
					if (!response.ok) {
						return {
							success: false,
							deliveryStatus: "failed",
							message: copy.literal(
								`The harness outbox answered ${response.status}.`,
							),
							data: null,
							externalMessageId: null,
						};
					}
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
