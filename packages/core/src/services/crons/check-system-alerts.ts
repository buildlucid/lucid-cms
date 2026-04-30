import { getAlertConfigs } from "../../libs/alerts/alert-map.js";
import type { ServiceFn } from "../../utils/services/types.js";

const checkSystemAlerts: ServiceFn<[], undefined> = async (context) => {
	for (const config of getAlertConfigs()) {
		if (!config.nightly) continue;

		const queueRes = await context.queue.add("alert:execute", {
			payload: {
				key: config.key,
				source: "cron",
				trigger: "scheduled",
				metadata: {},
			},
			context,
		});
		if (queueRes.error) return queueRes;
	}

	return {
		error: undefined,
		data: undefined,
	};
};

export default checkSystemAlerts;
