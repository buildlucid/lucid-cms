import type {
	AdapterKeys,
	RuntimeSupport,
} from "../../runtime-adapter/types.js";
import { logger } from "../../../index.js";

const featureSupportChecks = (
	adapterKeys: AdapterKeys,
	runtimeSupport: RuntimeSupport | undefined,
) => {
	const issues: Array<{
		type: string;
		key: string;
		level: "unsupported" | "notice";
		message?: string;
	}> = [];

	const checkAdapter = (
		type: string,
		key: string | null,
		adapterType:
			| "databaseAdapter"
			| "queueAdapter"
			| "kvAdapter"
			| "mediaAdapter"
			| "emailAdapter",
	) => {
		if (!key) return;

		const unsupportedList = runtimeSupport?.unsupported?.[adapterType] || [];
		const unsupported = unsupportedList.find((item) => item.key === key);

		if (unsupported) {
			issues.push({
				type,
				key,
				level: "unsupported",
				message: unsupported.message,
			});
			return;
		}

		const noticesList = runtimeSupport?.notices?.[adapterType] || [];
		const notice = noticesList.find((item) => item.key === key);

		if (notice) {
			issues.push({
				type,
				key,
				level: "notice",
				message: notice.message,
			});
		}
	};

	checkAdapter("Database", adapterKeys.database, "databaseAdapter");
	checkAdapter("Queue", adapterKeys.queue, "queueAdapter");
	checkAdapter("KV", adapterKeys.kv, "kvAdapter");
	checkAdapter("Media", adapterKeys.media, "mediaAdapter");
	checkAdapter("Email", adapterKeys.email, "emailAdapter");

	// log issues based on severity
	for (const issue of issues) {
		const message =
			issue.message || `${issue.key} is not supported on this runtime`;

		if (issue.level === "unsupported") {
			logger.error({
				message: `[${issue.type}] ${message}`,
			});
		} else {
			logger.warn({
				message: `[${issue.type}] ${message}`,
			});
		}
	}

	return {
		hasErrors: issues.some((i) => i.level === "unsupported"),
		hasWarnings: issues.some((i) => i.level === "notice"),
		issues,
	};
};

export default featureSupportChecks;
