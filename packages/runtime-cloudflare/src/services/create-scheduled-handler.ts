import { setupJobScheduler } from "@lucidcms/core/runtime";
import type {
	EnvironmentVariables,
	LucidInvocation,
} from "@lucidcms/core/types";
import type { CloudflareExecutionContext } from "../types.js";

/** Creates the Worker's `scheduled` method, which runs Lucid's job scheduler in its own invocation for each cron event. */
const createScheduledHandler =
	(
		createInvocation: (
			env: EnvironmentVariables,
			ctx: CloudflareExecutionContext,
		) => Promise<LucidInvocation>,
	) =>
	async (
		controller: { scheduledTime: number },
		env: EnvironmentVariables,
		ctx: CloudflareExecutionContext,
	) => {
		const runJobScheduler = async () => {
			const invocation = await createInvocation(env, ctx);

			try {
				await setupJobScheduler().run(await invocation.getServiceContext(), {
					scheduledAt: new Date(controller.scheduledTime),
				});
			} finally {
				await invocation.destroy();
			}
		};

		ctx.waitUntil(runJobScheduler());
	};

export default createScheduledHandler;
