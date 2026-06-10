import type { AiUsage } from "../../types/response.js";
import { getNumber, getObject } from "../../utils/helpers/index.js";
import type { Translator } from "../i18n/types.js";
import formatter from "./index.js";
import mediaFormatter, { type MediaPosterPropsT } from "./media.js";

export interface AiUsagePropT {
	id: number;
	request_id: string;
	provider_request_id: string | null;
	feature_key: string;
	feature_version: string;
	user_id: number | null;
	target_type: string;
	target: Record<string, unknown>;
	usage: Record<string, unknown> | null;
	model: string | null;
	cost_currency: string | null;
	cost_total_minor: number | null;
	duration_ms: number | null;
	status: "failed" | "pending" | "success";
	error_message: string | null;
	created_at: Date | string | null;
	email: string | null;
	username: string | null;
	first_name: string | null;
	last_name: string | null;
	profile_picture?: MediaPosterPropsT[];
}

const formatTokens = (
	usage: Record<string, unknown> | null,
): AiUsage["tokens"] => {
	const usageObject = getObject(usage);
	const tokens = getObject(usageObject?.tokens);
	const input = getObject(tokens?.input);
	const output = getObject(tokens?.output);

	const inputTotal = getNumber(input?.total);
	const outputTotal = getNumber(output?.total);
	const total = getNumber(tokens?.total);

	if (inputTotal === null || outputTotal === null || total === null) {
		return null;
	}

	return {
		input: inputTotal,
		output: outputTotal,
		total,
	};
};

const formatDurationMs = (usage: AiUsagePropT) => {
	if (usage.duration_ms === 0) return null;
	return usage.duration_ms;
};

export const formatAiUsageFeatureLabel = (props: {
	featureKey: string;
	translate: Translator;
}) => {
	const fallback = props.featureKey;

	switch (props.featureKey) {
		case "custom-field.input.generate":
			return props.translate(
				"server:core.ai.usage.features.custom.field.input.generate",
				{
					defaultMessage: "Field Generation",
				},
			);
		case "media.alt.generate":
			return props.translate(
				"server:core.ai.usage.features.media.alt.generate",
				{
					defaultMessage: "Alt Text",
				},
			);
		case "media.image.generate":
			return props.translate(
				"server:core.ai.usage.features.media.image.generate",
				{
					defaultMessage: "Image Generation",
				},
			);
		default:
			return fallback;
	}
};

const formatMultiple = (props: {
	aiUsage: AiUsagePropT[];
	host: string;
	translate: Translator;
}): AiUsage[] => {
	return props.aiUsage.map((usage) =>
		formatSingle({
			aiUsage: usage,
			host: props.host,
			translate: props.translate,
		}),
	);
};

const formatSingle = (props: {
	aiUsage: AiUsagePropT;
	host: string;
	translate: Translator;
}): AiUsage => {
	const user =
		props.aiUsage.user_id && props.aiUsage.email && props.aiUsage.username
			? {
					id: props.aiUsage.user_id,
					username: props.aiUsage.username,
					email: props.aiUsage.email,
					firstName: props.aiUsage.first_name,
					lastName: props.aiUsage.last_name,
					profilePicture: mediaFormatter.formatEmbed({
						poster: props.aiUsage.profile_picture?.[0],
						host: props.host,
					}),
				}
			: null;

	return {
		id: props.aiUsage.id,
		requestId: props.aiUsage.request_id,
		providerRequestId: props.aiUsage.provider_request_id,
		feature: {
			key: props.aiUsage.feature_key,
			label: formatAiUsageFeatureLabel({
				featureKey: props.aiUsage.feature_key,
				translate: props.translate,
			}),
			version: props.aiUsage.feature_version,
		},
		status: props.aiUsage.status,
		model: props.aiUsage.model,
		createdAt: formatter.formatDate(props.aiUsage.created_at),
		durationMs: formatDurationMs(props.aiUsage),
		errorMessage: props.aiUsage.error_message,
		tokens: formatTokens(props.aiUsage.usage),
		cost:
			props.aiUsage.cost_currency && props.aiUsage.cost_total_minor !== null
				? {
						currency: props.aiUsage.cost_currency,
						totalCostMinor: props.aiUsage.cost_total_minor,
					}
				: null,
		target: {
			type: props.aiUsage.target_type,
			data: getObject(props.aiUsage.target) ?? {},
		},
		user,
	};
};

export default {
	formatMultiple,
	formatSingle,
};
