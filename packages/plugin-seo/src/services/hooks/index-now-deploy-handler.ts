import { LucidError } from "@lucidcms/core";
import type { LucidHook } from "@lucidcms/core/types";
import type { SendIndexNowJob } from "../../jobs/send-index-now.js";

/**
 * Queues an IndexNow send once a run of the deploy that puts the site live succeeds. Other
 * endings, including `triggered` runs whose host never reports back, leave the changes for the
 * next successful run or a send from the Operations page.
 */
const indexNowDeployHandler =
	(
		deploy: string,
		job: SendIndexNowJob,
	): LucidHook<"deploys", "afterRunFinish">["handler"] =>
	async ({ data, toolkit }) => {
		if (data.deployKey !== deploy || data.status !== "succeeded") return;

		const queued = await toolkit.jobs.enqueueJob({ job, payload: null });
		if (queued.error) throw new LucidError(queued.error);
	};

export default indexNowDeployHandler;
