export type SettingsInclude = "email" | "media" | "system" | "ai";

export interface Settings {
	ai?: {
		enabled: boolean;
		features: {
			imageGeneration: boolean;
			altGeneration: boolean;
			customFieldGeneration: boolean;
		};
	};
	email?: {
		simulated: boolean;
		templates: string[];
		from: {
			email: string;
			name: string;
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
	system?: {
		runtime: string;
		database: string;
		kv: string;
		queue: string;
		media: string | null;
		email: string;
		imageProcessor: string | null;
		alertEmail: string | null;
	};
}

export type MediaStorageOptionName = "media_storage_used";

export type OptionsName = MediaStorageOptionName | "system_alert_email";

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
	scope: "cms:ai";
	resource: string;
	lastAttempt: number | null;
	lastVerified: number | null;
	errorKey: string | null;
	warning: boolean;
}
