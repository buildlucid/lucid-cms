import type { AiAccessFeature, AiFeature } from "../../types/response.js";

/** Maps CMS features to organisation permissions, with no hosted permission required for MCP. */
export const aiFeatureAccess = {
	chatTitles: "chat_titles",
	altGeneration: "alt_text",
	imageGeneration: "image_generation",
	audioGeneration: "audio_generation",
	agents: "agent",
	mcp: null,
} as const satisfies Record<AiFeature, AiAccessFeature | null>;
