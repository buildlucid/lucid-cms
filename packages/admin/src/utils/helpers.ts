import type { Accessor, Setter } from "solid-js";
import equal from "fast-deep-equal/es6";
import type { UserResponse, MediaResponse, LocaleValue } from "@types";
import { getLocale } from "@/translations";

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type GenericObject = Record<string, any>;

const deepMerge = (obj1: GenericObject, obj2: GenericObject): GenericObject => {
	const result: GenericObject = { ...obj1 };

	for (const key in obj2) {
		if (Object.prototype.hasOwnProperty.call(obj2, key)) {
			if (
				typeof obj2[key] === "object" &&
				obj2[key] !== null &&
				!Array.isArray(obj2[key]) &&
				obj1[key]
			) {
				result[key] = deepMerge(obj1[key], obj2[key]);
			} else {
				result[key] = obj2[key];
			}
		}
	}

	return result;
};

// ---------------------------------------------
// Returns any updated values in obj2 compared to obj1
const deepDiff = <T>(obj1: T, obj2: T): Partial<T> => {
	const result: Partial<T> = {};

	for (const key in obj1) {
		if (Object.prototype.hasOwnProperty.call(obj1, key)) {
			if (Array.isArray(obj1[key])) {
				if (!equal(obj1[key], obj2[key])) {
					result[key] = obj2[key];
				}
			} else if (typeof obj1[key] === "object" && obj1[key] !== null) {
				const diff = deepDiff(obj1[key], obj2[key]);
				if (Object.keys(diff).length > 0) {
					// @ts-ignore
					result[key] = diff;
				}
			} else {
				if (obj1[key] !== obj2[key]) {
					result[key] = obj2[key];
				}
			}
		}
	}

	// go through obj2 and find keys that are not in obj1
	for (const key in obj2) {
		if (
			Object.prototype.hasOwnProperty.call(obj2, key) &&
			!Object.prototype.hasOwnProperty.call(obj1, key)
		) {
			result[key] = obj2[key];
		}
	}

	return result;
};
const updateData = <T>(obj1: T, obj2: T) => {
	const result = deepDiff(obj1, obj2);

	return {
		changed: Object.keys(result).length > 0,
		data: result,
	};
};

// ---------------------------------------------
// Resolve signals and return the value
const resolveValue = <T>(value: Accessor<T> | T): T =>
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
	typeof value === "function" ? (value as any)() : value;

// ---------------------------------------------
// Bytes to human readable format
const bytesToSize = (bytes?: number | null): string => {
	if (!bytes) return "0 Byte";

	const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
	if (bytes === 0) return "0 Byte";
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return `${Math.round(bytes / 1024 ** i)} ${sizes[i]}`;
};

// ---------------------------------------------
// Get media type from mime type
const getMediaType = (mimeType?: string): MediaResponse["type"] => {
	if (!mimeType) return "unknown";
	const normalizedMimeType = mimeType.toLowerCase();

	if (normalizedMimeType.includes("image")) return "image";
	if (normalizedMimeType.includes("video")) return "video";
	if (normalizedMimeType.includes("audio")) return "audio";
	if (
		normalizedMimeType.includes("pdf") ||
		normalizedMimeType.startsWith("application/vnd")
	)
		return "document";
	if (normalizedMimeType.includes("zip") || normalizedMimeType.includes("tar"))
		return "archive";

	return "unknown";
};

// ---------------------------------------------
// Format user name
const formatUserName = (
	user: {
		username: UserResponse["username"];
		firstName?: UserResponse["firstName"];
		lastName?: UserResponse["lastName"];
	},
	pref?: "username",
): string => {
	// username (firstname lastname)
	if (pref === "username") {
		if (user.firstName && user.lastName) {
			return `${user.username} (${user.firstName} ${user.lastName})`;
		}

		if (user.firstName) {
			return `${user.username} (${user.firstName})`;
		}

		return user.username;
	}

	// firstname lastname - (username)
	if (user.firstName && user.lastName) {
		return `${user.firstName} ${user.lastName} - (${user.username})`;
	}
	if (user.firstName) {
		return `${user.firstName} - (${user.username})`;
	}

	return user.username;
};

// ---------------------------------------------
// Format User Initials
const formatUserInitials = (user: {
	firstName?: UserResponse["firstName"];
	lastName?: UserResponse["lastName"];
	username: UserResponse["username"];
}): string => {
	if (user.firstName && user.lastName) {
		return `${user.firstName[0]}${user.lastName[0]}`;
	}
	if (user.firstName) {
		return `${user.firstName[0]}${user.firstName[1]}`;
	}
	return `${user.username[0]}${user.username[1]}`;
};

// ---------------------------------------------
// Translation setter helper
const updateTranslation = (
	setter?: Setter<
		{
			localeCode: string | null;
			value: string | null;
		}[]
	>,
	translation?: {
		localeCode: string | null;
		value: string | null;
	},
) => {
	if (!setter) return;
	if (!translation) return;
	setter((prev) => {
		const index = prev.findIndex(
			(t) => t.localeCode === translation.localeCode,
		);
		if (index === -1) return [...prev, translation];

		return prev.map((item) =>
			item.localeCode === translation.localeCode ? translation : item,
		);
	});
};

const getTranslation = (
	translations?: {
		value: string | null;
		localeCode: string | null;
	}[],
	contentLocale?: string,
) => {
	const translation = translations?.find((t) => t.localeCode === contentLocale);
	return translation?.value ?? null;
};
const getRecordTranslation = (
	translations?: Record<string, string>,
	contentLocale?: string,
) => {
	if (!contentLocale) return null;
	if (!translations) return null;
	return translations[contentLocale] ?? null;
};

// ---------------------------------------------
// Content Locale Value
const getLocaleValue = (props: {
	value: LocaleValue | undefined | null;
	fallback?: string;
}) => {
	if (props.value === undefined || props.value === null)
		return props.fallback ?? "";
	if (typeof props.value === "string") return props.value;
	return props.value[getLocale()] ?? props.fallback ?? "";
};

// ---------------------------------------------
// Exports
const helpers = {
	deepMerge,
	deepDiff,
	updateData,
	resolveValue,
	bytesToSize,
	getMediaType,
	formatUserName,
	formatUserInitials,
	updateTranslation,
	getTranslation,
	getRecordTranslation,
	getLocaleValue,
};

export default helpers;
