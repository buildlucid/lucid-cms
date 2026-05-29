import type { ServiceFn } from "../../utils/services/types.js";
import { text } from "../i18n/index.js";
import { getAlertConfig } from "./alert-map.js";
import type { AlertExecutionPayload } from "./types.js";

/**
 * Runs a single alert producer resolved from the registered alert map.
 */
const executeAlert: ServiceFn<[AlertExecutionPayload], undefined> = async (
	context,
	data,
) => {
	const config = getAlertConfig(data.key);
	if (!config) {
		return {
			error: {
				type: "basic",
				message: text.server("core.alerts.unknown.key.message", {
					data: {
						key: data.key,
					},
				}),
				status: 400,
			},
			data: undefined,
		};
	}

	return config.service(context, data);
};

export default executeAlert;
