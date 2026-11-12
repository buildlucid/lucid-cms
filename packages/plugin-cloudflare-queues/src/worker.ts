import type { CloudflareWorkerHandler } from "@lucidcms/cloudflare/types";
import { consumeJob, logScopes } from "@lucidcms/core/extension";
import { logger } from "@lucidcms/core/runtime";
import { PLUGIN_KEY } from "./constants.js";

/** Matches the message body the queue adapter publishes. */
const isJobMessage = (body: unknown): body is { version: 1; jobId: string } =>
	typeof body === "object" &&
	body !== null &&
	"version" in body &&
	body.version === 1 &&
	"jobId" in body &&
	typeof body.jobId === "string";

/**
 * Consumes Lucid jobs delivered by Cloudflare Queues, acknowledging or retrying each message. A
 * batch's messages run side by side, so a slow job doesn't hold up the others in its batch.
 */
const queue: CloudflareWorkerHandler<MessageBatch> = async ({
	event: batch,
	invocation,
}) => {
	const serviceContext = await invocation.getServiceContext();

	const consume = async (message: Message) => {
		try {
			if (!isJobMessage(message.body)) {
				logger.error({
					message: "Ignoring an invalid Cloudflare queue message",
					owner: PLUGIN_KEY,
					scope: logScopes.queueAdapter,
				});
				message.ack();
				return;
			}
			const { jobId } = message.body;

			logger.debug({
				message: "Processing Cloudflare queue message",
				owner: PLUGIN_KEY,
				scope: logScopes.queueAdapter,
				data: { jobId },
			});

			const result = await consumeJob(serviceContext, { jobId });
			if (result.type === "retry-transport") {
				message.retry(
					result.delayMs === undefined
						? undefined
						: { delaySeconds: Math.ceil(result.delayMs / 1000) },
				);
				return;
			}
			message.ack();
		} catch (error) {
			logger.error({
				message: "Error processing queue message",
				owner: PLUGIN_KEY,
				scope: logScopes.queueAdapter,
				data: {
					error: error instanceof Error ? error.message : String(error),
					stack: error instanceof Error ? error.stack : undefined,
				},
			});
			message.retry();
		}
	};

	await Promise.all(batch.messages.map(consume));
};

export default queue;
