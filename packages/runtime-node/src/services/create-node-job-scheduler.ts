import { setupJobScheduler } from "@lucidcms/core/runtime";
import type { LucidInvocation } from "@lucidcms/core/types";
import cron from "node-cron";

type NodeJobSchedulerInvocation = Pick<
	LucidInvocation,
	"destroy" | "getServiceContext"
>;

type CreateNodeJobSchedulerOptions = {
	createInvocation: () =>
		| NodeJobSchedulerInvocation
		| Promise<NodeJobSchedulerInvocation>;
	request?: Parameters<LucidInvocation["getServiceContext"]>[0];
};

/** Runs Lucid's shared job scheduler from one Node cron timer. */
const createNodeJobScheduler = (options: CreateNodeJobSchedulerOptions) => {
	const jobScheduler = setupJobScheduler();
	const activeTicks = new Set<Promise<void>>();
	let schedulerTask: ReturnType<typeof cron.schedule> | undefined;
	let destroyPromise: Promise<void> | undefined;

	return {
		start: () => {
			if (schedulerTask || destroyPromise) return;
			schedulerTask = cron.schedule(
				jobScheduler.schedule,
				async ({ date }) => {
					const tick = Promise.resolve().then(async () => {
						const invocation = await options.createInvocation();
						try {
							await jobScheduler.run(
								await invocation.getServiceContext(options.request),
								{ scheduledAt: date },
							);
						} finally {
							await invocation.destroy();
						}
					});
					activeTicks.add(tick);
					try {
						await tick;
					} finally {
						activeTicks.delete(tick);
					}
				},
				{ noOverlap: true },
			);
		},
		destroy: () => {
			destroyPromise ??= (async () => {
				await schedulerTask?.destroy();
				await Promise.allSettled(activeTicks);
			})();
			return destroyPromise;
		},
	};
};

export default createNodeJobScheduler;
