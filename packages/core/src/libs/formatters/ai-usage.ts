import type {
	AiUsageMeasure,
	AiUsageRecord,
	AiUsageSession,
	AiUsageSessionType,
	UserRef,
} from "../../types/response.js";
import type { LucidAiGenerations } from "../db/tables/index.js";
import type { Select } from "../db/types.js";
import { cmsWebUsageSchema } from "../lucid-remote/schema/ai.js";
import formatter from "./helpers.js";

/** Aggregates arrive as numbers or strings depending on the database. */
type Aggregate = number | string | null;

export interface AiUsageSessionPropT {
	session_type: AiUsageSessionType;
	session_id: string;
	user_id: number | null;
	credits: Aggregate;
	input_tokens: Aggregate;
	output_tokens: Aggregate;
	total_tokens: Aggregate;
	requests: Aggregate;
	web_searches: Aggregate;
	web_fetches: Aggregate;
	failed: Aggregate;
	pending: Aggregate;
	started_at: Date | string | null;
	last_activity_at: Date | string | null;
}

export type AiUsageRecordPropT = Pick<
	Select<LucidAiGenerations>,
	| "id"
	| "request_id"
	| "provider_request_id"
	| "feature_key"
	| "feature_version"
	| "status"
	| "agent_run_id"
	| "usage"
	| "model"
	| "credits"
	| "input_tokens"
	| "output_tokens"
	| "total_tokens"
	| "duration_ms"
	| "error_message"
	| "created_at"
>;

const toNumber = (value: Aggregate) => Number(value ?? 0);

const formatMeasure = (record: AiUsageRecordPropT): AiUsageMeasure | null => {
	if (
		record.model !== null &&
		record.input_tokens !== null &&
		record.output_tokens !== null &&
		record.total_tokens !== null
	) {
		return {
			kind: "model",
			model: record.model,
			tokens: {
				input: record.input_tokens,
				output: record.output_tokens,
				total: record.total_tokens,
			},
		};
	}

	const web = cmsWebUsageSchema.safeParse(record.usage);
	if (!web.success) return null;

	return {
		kind: "web",
		operation: web.data.operation,
		requests: web.data.requests,
	};
};

const formatRecord = (record: AiUsageRecordPropT): AiUsageRecord => ({
	id: record.id,
	requestId: record.request_id,
	providerRequestId: record.provider_request_id,
	feature: {
		key: record.feature_key,
		version: record.feature_version,
	},
	status: record.status,
	runId: record.agent_run_id,
	usage: formatMeasure(record),
	credits: record.credits,
	//* zero means the request finished before it could be timed
	durationMs: record.duration_ms || null,
	errorMessage: record.error_message,
	createdAt: formatter.formatDate(record.created_at),
});

const formatSession = (props: {
	session: AiUsageSessionPropT;
	user: UserRef;
	conversation: AiUsageSession["conversation"];
}): AiUsageSession => ({
	type: props.session.session_type,
	id: props.session.session_id,
	conversation: props.conversation,
	user: props.user,
	credits: toNumber(props.session.credits),
	tokens: {
		input: toNumber(props.session.input_tokens),
		output: toNumber(props.session.output_tokens),
		total: toNumber(props.session.total_tokens),
	},
	requests: {
		total: toNumber(props.session.requests),
		webSearches: toNumber(props.session.web_searches),
		webFetches: toNumber(props.session.web_fetches),
		failed: toNumber(props.session.failed),
		pending: toNumber(props.session.pending),
	},
	startedAt: formatter.formatDate(props.session.started_at),
	lastActivityAt: formatter.formatDate(props.session.last_activity_at),
});

export default {
	formatRecord,
	formatSession,
};
