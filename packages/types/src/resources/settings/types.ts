import type { AgentMemoryScope, AgentSummary } from "../agent/types.js";
import type { AiAccessFeature, AiFeature } from "../ai/types.js";

export type SettingsInclude =
	| "email"
	| "media"
	| "system"
	| "ai"
	| "mcp"
	| "agents"
	| "site";

export interface Settings {
	site?: {
		/** The website's absolute URL, or null when none is configured. */
		url: string | null;
	};
	ai?: {
		enabled: boolean;
		agents: AgentSummary[];
		features: Record<AiFeature, boolean>;
		/** Whether each memory scope is turned on. */
		memory: Record<AgentMemoryScope, boolean>;
	};
	email?: {
		simulated: boolean;
		templates: string[];
		from: {
			email?: string;
			name?: string;
		} | null;
	};
	media?: {
		enabled: boolean;
		storage: {
			total: number | null;
			remaining: number | null;
			used: number | null;
		};
		processed: {
			stored: boolean;
			imageLimit: number;
			total: number | null;
		};
	};
	mcp?: {
		enabled: boolean;
		tools: {
			name: string;
			description: string;
		}[];
	};
	/** The agents in use, as defined in code. */
	agents?: {
		enabled: boolean;
		agents: {
			key: string;
			name: string;
			description: string;
			sidebar: boolean;
			tools: {
				name: string;
				title: string;
			}[];
			routines: {
				key: string;
				name: string;
			}[];
		}[];
	};
	system?: {
		runtime: string | null;
		database: string;
		kv: string;
		queue: string;
		mediaStorage: string | null;
		email: string;
		mediaDelivery: string;
		captcha: string | null;
	};
}

export type MediaStorageOptionName = "media_storage_used";

export type OptionsName = MediaStorageOptionName;

export interface Option {
	name: OptionsName;
	valueText: string | null;
	valueInt: number | null;
	valueBool: boolean | null;
}

export type ConnectionState = "connected" | "disconnected" | "revoked";

export interface ConnectionStatus {
	status: ConnectionState;
	connection: {
		id: string;
		name: string | null;
		status: "active";
		clientName: string;
		clientOrigin: string | null;
	} | null;
	organisation: {
		id: string;
		name: string;
	} | null;
	/** The AI features the organisation allows this CMS to use. */
	ai: {
		features: AiAccessFeature[];
	} | null;
	scope: "cms:ai";
	resource: string;
	lastAttempt: number | null;
	lastVerified: number | null;
	errorKey: string | null;
	warning: boolean;
}
