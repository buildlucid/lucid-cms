export type SettingsInclude = "email" | "media" | "license" | "system";

export interface Settings {
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
	license?: {
		key: string | null;
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

export type OptionsName =
	| "media_storage_used"
	| "system_alert_email"
	| "license_key"
	| "license_key_last4"
	| "license_valid"
	| "license_last_checked"
	| "license_error_message";

export interface Option {
	name: OptionsName;
	valueText: string | null;
	valueInt: number | null;
	valueBool: boolean | null;
}

export interface License {
	key: string | null;
	valid: boolean;
	lastChecked: number | null;
	errorMessage: string | null;
}
