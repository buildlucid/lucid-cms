import constants from "../../../constants/constants.js";
import type { ServiceResponse } from "../../../utils/services/types.js";
import { parseEmailStorageRules } from "./config.js";
import {
	decryptEmailStorageValue,
	encryptEmailStorageValue,
} from "./encryption.js";
import {
	cloneValue,
	emailStorageSegmentsToPath,
	getValueAtEmailStoragePath,
	removeValueAtEmailStoragePath,
	resolveExistingEmailStoragePaths,
	setValueAtEmailStoragePath,
} from "./paths.js";
import type { EmailStorageConfig, ParsedEmailStorageRule } from "./types.js";

const sortRules = (
	rules: ParsedEmailStorageRule[],
	direction: "specific" | "broad",
) =>
	[...rules].sort((a, b) => {
		const specificityDiff =
			direction === "specific"
				? b.specificity - a.specificity
				: a.specificity - b.specificity;

		if (specificityDiff !== 0) return specificityDiff;
		return a.index - b.index;
	});

/**
 * Builds the DB-safe email data payload, encrypting configured fields first.
 */
export const createStoredEmailData = (props: {
	data: Record<string, unknown> | null;
	storage?: EmailStorageConfig | null;
	encryptionKey: string;
	options?: {
		encryptNeverStore?: boolean;
	};
}): Awaited<ServiceResponse<Record<string, unknown> | null>> => {
	if (props.data === null) return { error: undefined, data: null };

	const rulesRes = parseEmailStorageRules(props.storage);
	if (rulesRes.error) return rulesRes;

	const data = cloneValue(props.data);
	const rules = sortRules(rulesRes.data, "specific");

	for (const { rule, segments } of rules) {
		if (
			rule.encrypt !== true &&
			(rule.neverStore !== true || props.options?.encryptNeverStore === false)
		) {
			continue;
		}

		for (const path of resolveExistingEmailStoragePaths(data, segments)) {
			const encryptedValueRes = encryptEmailStorageValue(
				getValueAtEmailStoragePath(data, path),
				props.encryptionKey,
			);
			if (encryptedValueRes.error) return encryptedValueRes;

			setValueAtEmailStoragePath(data, path, encryptedValueRes.data);
		}
	}

	return {
		error: undefined,
		data,
	};
};

/**
 * Resolves stored data for preview or send without using fallbacks for sends.
 */
export const resolveEmailData = (props: {
	data: Record<string, unknown> | null;
	storage?: EmailStorageConfig | null;
	encryptionKey: string;
	mode: "preview" | "send";
}): Awaited<ServiceResponse<Record<string, unknown> | null>> => {
	if (props.data === null) return { error: undefined, data: null };

	const rulesRes = parseEmailStorageRules(props.storage);
	if (rulesRes.error) return rulesRes;

	const data = cloneValue(props.data);
	const rules = rulesRes.data;

	for (const { rule, segments } of sortRules(rules, "broad")) {
		if (rule.encrypt !== true && rule.neverStore !== true) continue;
		if (
			props.mode === "preview" &&
			(rule.redact === true || rule.neverStore === true)
		) {
			continue;
		}

		for (const path of resolveExistingEmailStoragePaths(data, segments)) {
			const decryptedValueRes = decryptEmailStorageValue(
				getValueAtEmailStoragePath(data, path),
				props.encryptionKey,
			);
			if (decryptedValueRes.error) return decryptedValueRes;

			setValueAtEmailStoragePath(data, path, decryptedValueRes.data);
		}
	}

	if (props.mode === "send") {
		return {
			error: undefined,
			data,
		};
	}

	for (const { rule, segments } of sortRules(rules, "broad")) {
		if (rule.redact !== true && rule.neverStore !== true) continue;

		const fallback =
			rule.previewFallback ?? constants.email.storage.defaultPreviewFallback;
		const paths = resolveExistingEmailStoragePaths(data, segments);
		const selectorHasWildcard = segments.some(
			(segment) => segment.type === "wildcard",
		);

		if (paths.length === 0 && !selectorHasWildcard) {
			setValueAtEmailStoragePath(
				data,
				emailStorageSegmentsToPath(segments),
				cloneValue(fallback),
				{
					createMissing: true,
				},
			);
			continue;
		}

		for (const path of paths) {
			setValueAtEmailStoragePath(data, path, cloneValue(fallback));
		}
	}

	return {
		error: undefined,
		data,
	};
};

/**
 * Removes fields that are only allowed to exist until a successful send.
 */
export const stripNeverStoreEmailData = (props: {
	data: Record<string, unknown> | null;
	storage?: EmailStorageConfig | null;
}): Awaited<ServiceResponse<Record<string, unknown> | null>> => {
	if (props.data === null) return { error: undefined, data: null };

	const rulesRes = parseEmailStorageRules(props.storage);
	if (rulesRes.error) return rulesRes;

	const data = cloneValue(props.data);
	const rules = sortRules(rulesRes.data, "specific");

	for (const { rule, segments } of rules) {
		if (rule.neverStore !== true) continue;

		for (const path of resolveExistingEmailStoragePaths(data, segments)) {
			removeValueAtEmailStoragePath(data, path);
		}
	}

	return {
		error: undefined,
		data,
	};
};
