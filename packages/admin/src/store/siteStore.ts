import type { License, Settings } from "@types";
import { createStore } from "solid-js/store";

type AiSettings = NonNullable<Settings["ai"]>;

export type AiFeature = keyof AiSettings["features"];

type SiteStoreT = {
	license: License | null;
	ai: AiSettings;
	reset: () => void;
	isAiFeatureEnabled: (_feature: AiFeature) => boolean;
	hasAnyAiFeatureEnabled: () => boolean;
};

const defaultAiSettings = (): AiSettings => ({
	enabled: true,
	features: {
		imageGeneration: true,
		altGeneration: true,
		customFieldGeneration: true,
	},
});

const [get, set] = createStore<SiteStoreT>({
	license: null,
	ai: defaultAiSettings(),
	reset() {
		set("license", null);
		set("ai", defaultAiSettings());
	},
	isAiFeatureEnabled(feature) {
		return this.ai.enabled && this.ai.features[feature];
	},
	hasAnyAiFeatureEnabled() {
		return this.ai.enabled && Object.values(this.ai.features).some(Boolean);
	},
});

const siteStore = {
	get,
	set,
	setLicense(license: License | null) {
		set("license", license);
	},
	setAi(ai: Settings["ai"] | undefined) {
		set("ai", ai ?? defaultAiSettings());
	},
};

export default siteStore;
