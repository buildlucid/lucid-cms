import { aiFeatureAccess } from "@ai-feature-access";
import type { ConnectionStatus, Settings } from "@types";
import { createStore } from "solid-js/store";

type AiSettings = NonNullable<Settings["ai"]>;

export type AiFeature = keyof AiSettings["features"];

type SiteStoreT = {
	connection: ConnectionStatus | null;
	ai: AiSettings;
	reset: () => void;
	isAiFeatureEnabled: (_feature: AiFeature) => boolean;
	hasAnyAiFeatureEnabled: () => boolean;
};

const defaultAiSettings = (): AiSettings => ({
	enabled: true,
	features: {
		imageGeneration: true,
		audioGeneration: true,
		altGeneration: true,
		chatTitles: true,
		agents: true,
		mcp: false,
	},
	agents: [],
});

const [get, set] = createStore<SiteStoreT>({
	connection: null,
	ai: defaultAiSettings(),
	reset() {
		set("connection", null);
		set("ai", defaultAiSettings());
	},
	//* When organisation access is unknown, use configuration alone; Lucid still checks remote requests.
	isAiFeatureEnabled(feature) {
		const accessFeature = aiFeatureAccess[feature];
		const access = this.connection?.ai?.features;
		return (
			this.ai.enabled &&
			this.ai.features[feature] &&
			(accessFeature === null || !access || access.includes(accessFeature))
		);
	},
	//* only features billed through Lucid count, so MCP alone does not show AI usage
	hasAnyAiFeatureEnabled() {
		const { features } = this.ai;
		return (
			this.ai.enabled &&
			(this.ai.agents.length > 0 ||
				features.imageGeneration ||
				features.audioGeneration ||
				features.altGeneration)
		);
	},
});

const siteStore = {
	get,
	set,
	setConnection(connection: ConnectionStatus | null) {
		set("connection", connection);
	},
	setAi(ai: Settings["ai"] | undefined) {
		set("ai", ai ?? defaultAiSettings());
	},
};

export default siteStore;
