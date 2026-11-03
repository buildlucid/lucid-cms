import { defineRoute, logger, z } from "@lucidcms/core";

const bodySchema = z.object({
	data: z.object({ callbackUrl: z.url() }),
});

/**
 * Stands in for a CI service for the playground's deploys. It accepts a build straight away, then
 * reports it as succeeded to the run's callback URL about 20 seconds later.
 */
const fakeCiRoute = defineRoute({
	method: "post",
	path: "/playground/fake-ci",
	schema: { body: bodySchema },
	openAPI: {
		summary: "Fake CI for playground deploys",
		description:
			"Accepts a deploy webhook and reports the build as succeeded to its callback URL after about 20 seconds.",
		tags: ["Playground"],
	},
	handler: async ({ hono, input }) => {
		setTimeout(() => {
			fetch(input.body.data.callbackUrl, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ status: "succeeded" }),
			}).catch((error: unknown) => {
				logger.error({
					message: "The playground's fake CI couldn't report back",
					error,
				});
			});
		}, 20_000);

		return hono.body(null, 202);
	},
});

export default fakeCiRoute;
