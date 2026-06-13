import type {
	LicenseOptionName,
	OptionsName,
} from "../../../schemas/options.js";

/**
 * Builds the option name for a tenant-scoped license value.
 * Installs without tenants keep the original global option names.
 */
export const getLicenseOptionName = (
	tenantKey: string | null | undefined,
	name: LicenseOptionName,
): OptionsName => {
	if (!tenantKey) return name;
	return `${name}:t:${tenantKey}` as OptionsName;
};

/**
 * Builds a list of scoped license option names for option repository queries.
 */
export const getLicenseOptionNames = (
	tenantKey: string | null | undefined,
	names: LicenseOptionName[],
): OptionsName[] => names.map((name) => getLicenseOptionName(tenantKey, name));

/**
 * Reads the base license option name back from a tenant-scoped key.
 */
export const getLicenseOptionBaseName = (
	name: OptionsName,
): LicenseOptionName | null => {
	const baseName = name.split(":t:")[0];
	if (
		baseName === "license_key" ||
		baseName === "license_key_display" ||
		baseName === "license_valid" ||
		baseName === "license_last_checked" ||
		baseName === "license_error_message" ||
		baseName === "license_ai_enabled"
	) {
		return baseName;
	}
	return null;
};
