import storageCheckAlert from "../../services/media/alerts/storage-check.js";
import type { AlertConfig, InternalAlertKey } from "./types.js";

/**
 * Registers internal alert producers so cron and jobs can execute them by key.
 */
export const alertMap = {
	"storage-check": {
		key: "storage-check",
		nightly: true,
		service: storageCheckAlert,
	},
} as const satisfies Record<InternalAlertKey, AlertConfig>;

/**
 * Returns every registered alert config for scheduler-style workflows.
 */
export const getAlertConfigs = () => {
	return Object.values(alertMap);
};

/**
 * Looks up one alert config for targeted programmatic or queued execution.
 */
export const getAlertConfig = (key: string) => {
	return alertMap[key as InternalAlertKey];
};
