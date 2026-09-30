import type {
	AiUsageChartMetric,
	AiUsageFeatureKey,
	AiUsageMeasure,
	AiUsageSessionType,
} from "@types";
import { Permissions } from "@/constants/permissions";
import siteStore from "@/store/siteStore/siteStore";
import userStore from "@/store/userStore/userStore";
import T from "@/translations";

const numberFormatter = new Intl.NumberFormat();
const creditsFormatter = new Intl.NumberFormat(undefined, {
	maximumFractionDigits: 2,
});

const aiUsageChartMetrics = [
	"credits",
	"totalTokens",
	"requests",
] as const satisfies AiUsageChartMetric[];

const aiUsageSessionTypes = [
	"agent",
	"media-image",
	"media-alt",
	"custom-field",
] as const satisfies AiUsageSessionType[];

export const formatAiUsageNumber = (value?: number | null) => {
	if (value === undefined || value === null) return undefined;
	return numberFormatter.format(value);
};

export const formatAiCredits = (value?: number | null) => {
	if (value === undefined || value === null) return undefined;
	return T()("ai.usage.credits.value", {
		value: creditsFormatter.format(value),
	});
};

//* typed against every usage feature, so a new feature cannot ship without a label
const aiUsageFeatureLabels = {
	"agent.chat": "ai.usage.features.agent.chat",
	"agent.compact": "ai.usage.features.agent.compact",
	"agent.title.generate": "ai.usage.features.agent.title.generate",
	"web.search": "ai.usage.features.web.search",
	"web.fetch": "ai.usage.features.web.fetch",
	"media.analyze": "ai.usage.features.media.analyze",
	"custom-field.input.generate":
		"ai.usage.features.custom.field.input.generate",
	"media.alt.generate": "ai.usage.features.media.alt.generate",
	"media.image.generate": "ai.usage.features.media.image.generate",
} satisfies Record<AiUsageFeatureKey, string>;

export const getAiUsageFeatureOptions = () =>
	Object.entries(aiUsageFeatureLabels).map(([value, label]) => ({
		value,
		label: T()(label),
	}));

export const getAiUsageFeatureLabel = (key: string) =>
	getAiUsageFeatureOptions().find((option) => option.value === key)?.label ??
	key;

export const getAiUsageSessionTypeOptions = () =>
	aiUsageSessionTypes.map((type) => ({
		value: type,
		label: getAiUsageSessionTypeLabel(type),
	}));

export const getAiUsageSessionTypeLabel = (type: AiUsageSessionType) =>
	T()(`ai.usage.session.types.${type}`);

export const isAiUsageSessionType = (
	value: unknown,
): value is AiUsageSessionType =>
	typeof value === "string" &&
	aiUsageSessionTypes.includes(value as AiUsageSessionType);

export const aiUsageSessionParam = (session: {
	type: AiUsageSessionType;
	id: string;
}) => `${session.type}:${session.id}`;

export const aiUsageSessionHref = (session: {
	type: AiUsageSessionType;
	id: string;
}) =>
	`/lucid/system/ai-usage?session=${encodeURIComponent(aiUsageSessionParam(session))}`;

/** Call inside a reactive scope. */
export const canViewAiUsage = () =>
	userStore.get.hasPermission([Permissions.SettingsRead]).all &&
	siteStore.get.hasAnyAiFeatureEnabled();

export const parseAiUsageSessionParam = (value?: string) => {
	if (!value) return undefined;
	const separator = value.indexOf(":");
	const type = value.slice(0, separator);
	const id = value.slice(separator + 1);
	if (separator === -1 || !isAiUsageSessionType(type) || !id) {
		return undefined;
	}
	return { type, id };
};

export const formatAiUsageMeasure = (usage: AiUsageMeasure | null) => {
	if (!usage) return undefined;
	if (usage.kind === "web") {
		return T()(`ai.usage.web.${usage.operation}.count`, {
			count: usage.requests,
		});
	}
	return T()("ai.usage.tokens.value", {
		value: formatAiUsageNumber(usage.tokens.total),
	});
};

export const getAiUsageChartMetricOptions = () =>
	aiUsageChartMetrics.map((metric) => ({
		value: metric,
		label: getAiUsageChartMetricLabel(metric),
	}));

export const isAiUsageChartMetric = (
	value: unknown,
): value is AiUsageChartMetric =>
	typeof value === "string" &&
	aiUsageChartMetrics.includes(value as AiUsageChartMetric);

export const getAiUsageChartMetricLabel = (metric: AiUsageChartMetric) =>
	T()(`ai.usage.metrics.${metric}`);

export const getDefaultAiUsageChartDates = () => {
	const end = new Date();
	const start = new Date(end);
	start.setDate(start.getDate() - 13);

	return {
		startDate: start.toISOString().slice(0, 10),
		endDate: end.toISOString().slice(0, 10),
	};
};

export const formatAiUsageChartValue = (props: {
	metric: AiUsageChartMetric;
	value: number;
}) =>
	props.metric === "credits"
		? formatAiCredits(props.value)
		: formatAiUsageNumber(props.value);
