import type { ServiceFn } from "../../utils/services/types.js";

export type AlertSource = "cron" | "programmatic";
export type AlertTrigger =
	| "scheduled"
	| "media_upload_rejected"
	| "media_replacement_rejected"
	| string;

export type InternalAlertKey = "storage-check";
export type AlertKey = InternalAlertKey | string;

export type AlertExecutionPayload = {
	key: AlertKey;
	source?: AlertSource;
	trigger?: AlertTrigger;
	metadata?: Record<string, unknown>;
};

export type AlertService = ServiceFn<[AlertExecutionPayload], undefined>;

export type AlertConfig = {
	key: InternalAlertKey;
	nightly?: boolean;
	service: AlertService;
};
