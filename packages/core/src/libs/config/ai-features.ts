import type { ResolvedLucidConfig } from "../../types/config.js";
import type {
	AiAccessFeature,
	AiFeature,
	MediaGenerateFeatures,
	MediaGenerationType,
} from "../../types/response.js";
import { Permissions } from "../permission/definitions.js";
import type { Permission } from "../permission/types.js";
import { aiFeatureAccess } from "./ai-feature-access.js";

/** The media types Lucid can generate, in the order the admin lists them. */
export const mediaGenerationTypes = [
	"image",
	"audio",
] as const satisfies readonly MediaGenerationType[];

/** The Lucid feature and permission behind each media type. */
export const mediaGenerationFeatures = {
	image: {
		feature: { key: "media.image.generate", version: "v1" },
		permission: Permissions.AiImageGenerate,
	},
	audio: {
		feature: { key: "media.audio.generate", version: "v1" },
		permission: Permissions.AiAudioGenerate,
	},
} as const satisfies {
	[Type in MediaGenerationType]: {
		feature: MediaGenerateFeatures[Type];
		permission: Permission;
	};
};

/** Permissions that each allow some media generation. */
export const mediaGenerationPermissions = mediaGenerationTypes.map(
	(type) => mediaGenerationFeatures[type].permission,
);

/** Maps feature keys to correlated media types and Lucid features. */
export const mediaGenerations: {
	[Type in MediaGenerationType as MediaGenerateFeatures[Type]["key"]]: {
		type: Type;
		feature: MediaGenerateFeatures[Type];
	};
} = {
	"media.image.generate": {
		type: "image",
		feature: mediaGenerationFeatures.image.feature,
	},
	"media.audio.generate": {
		type: "audio",
		feature: mediaGenerationFeatures.audio.feature,
	},
};

/** The media type and Lucid feature behind a feature key, if it generates media. */
export const mediaGenerationOf = (featureKey: string) =>
	Object.values(mediaGenerations).find(
		(generation) => generation.feature.key === featureKey,
	);

/** Each AI feature's own switch, without `ai.enabled`. */
export const aiFeatureFlags = (
	ai: ResolvedLucidConfig["ai"],
): Record<AiFeature, boolean> => ({
	chatTitles: ai.chatTitles,
	altGeneration: ai.altGeneration,
	imageGeneration: ai.mediaGeneration.image.enabled,
	audioGeneration: ai.mediaGeneration.audio.enabled,
	agents: ai.agents.enabled,
	mcp: ai.mcp.enabled,
});

/**
 * Checks AI configuration and, when provided, organisation feature access.
 * @remarks Omitting `access` checks configuration alone.
 */
export const isAiFeatureEnabled = (
	config: Pick<ResolvedLucidConfig, "ai">,
	feature: AiFeature,
	access?: readonly AiAccessFeature[],
) => {
	const accessFeature = aiFeatureAccess[feature];

	return (
		config.ai.enabled &&
		aiFeatureFlags(config.ai)[feature] &&
		(access === undefined ||
			accessFeature === null ||
			access.includes(accessFeature))
	);
};
