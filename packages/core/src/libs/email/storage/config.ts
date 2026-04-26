import constants from "../../../constants/constants.js";
import T from "../../../translations/index.js";
import type { ServiceResponse } from "../../../utils/services/types.js";
import { isRecord } from "./paths.js";
import type {
	EmailStorageConfig,
	EmailStoragePathSegment,
	EmailStorageRule,
	ParsedEmailStorageRule,
} from "./types.js";

/**
 * Parses a storage selector into path segments used by the storage transforms.
 */
export const parseEmailStorageSelector = (
	selector: string,
): Awaited<ServiceResponse<EmailStoragePathSegment[]>> => {
	const segments: EmailStoragePathSegment[] = [];
	let index = 0;

	while (index < selector.length) {
		if (selector[index] === ".") {
			return {
				error: {
					type: "validation",
					status: 400,
					message: T("email_storage_invalid_selector", { selector }),
				},
				data: undefined,
			};
		}

		let key = "";
		while (
			index < selector.length &&
			selector[index] !== "." &&
			selector[index] !== "["
		) {
			if (selector[index] === "]") {
				return {
					error: {
						type: "validation",
						status: 400,
						message: T("email_storage_invalid_selector", { selector }),
					},
					data: undefined,
				};
			}
			key += selector[index];
			index++;
		}

		if (key.length > 0) {
			segments.push({
				type: "key",
				key,
			});
		}

		while (index < selector.length && selector[index] === "[") {
			const closeIndex = selector.indexOf("]", index);
			if (closeIndex === -1) {
				return {
					error: {
						type: "validation",
						status: 400,
						message: T("email_storage_invalid_selector", { selector }),
					},
					data: undefined,
				};
			}

			const content = selector.slice(index + 1, closeIndex);
			if (content === "*") {
				segments.push({ type: "wildcard" });
			} else if (/^\d+$/.test(content)) {
				segments.push({
					type: "index",
					index: Number.parseInt(content, 10),
				});
			} else {
				return {
					error: {
						type: "validation",
						status: 400,
						message: T("email_storage_invalid_selector", { selector }),
					},
					data: undefined,
				};
			}

			index = closeIndex + 1;
		}

		if (index < selector.length) {
			if (selector[index] !== ".") {
				return {
					error: {
						type: "validation",
						status: 400,
						message: T("email_storage_invalid_selector", { selector }),
					},
					data: undefined,
				};
			}
			index++;
			if (index >= selector.length) {
				return {
					error: {
						type: "validation",
						status: 400,
						message: T("email_storage_invalid_selector", { selector }),
					},
					data: undefined,
				};
			}
		}
	}

	if (segments.length === 0) {
		return {
			error: {
				type: "validation",
				status: 400,
				message: T("email_storage_invalid_selector", { selector }),
			},
			data: undefined,
		};
	}

	return {
		error: undefined,
		data: segments,
	};
};

const normalizeEmailStorageRule = (
	selector: string,
	value: unknown,
): Awaited<ServiceResponse<EmailStorageRule>> => {
	if (!isRecord(value)) {
		return {
			error: {
				type: "validation",
				status: 400,
				message: T("email_storage_rule_must_be_object", { selector }),
			},
			data: undefined,
		};
	}

	const encryptValue = value.encrypt;
	const redactValue = value.redact;
	const neverStoreValue = value.neverStore;

	if (encryptValue !== undefined && encryptValue !== true) {
		return {
			error: {
				type: "validation",
				status: 400,
				message: T("email_storage_rule_flag_true", {
					selector,
					flag: "encrypt",
				}),
			},
			data: undefined,
		};
	}

	if (redactValue !== undefined && redactValue !== true) {
		return {
			error: {
				type: "validation",
				status: 400,
				message: T("email_storage_rule_flag_true", {
					selector,
					flag: "redact",
				}),
			},
			data: undefined,
		};
	}

	if (neverStoreValue !== undefined && neverStoreValue !== true) {
		return {
			error: {
				type: "validation",
				status: 400,
				message: T("email_storage_rule_flag_true", {
					selector,
					flag: "neverStore",
				}),
			},
			data: undefined,
		};
	}

	const encryptRule = encryptValue === true;
	const redactRule = redactValue === true;
	const neverStoreRule = neverStoreValue === true;

	if (!encryptRule && !redactRule && !neverStoreRule) {
		return {
			error: {
				type: "validation",
				status: 400,
				message: T("email_storage_rule_requires_flag", { selector }),
			},
			data: undefined,
		};
	}

	if (neverStoreRule && (encryptRule || redactRule)) {
		return {
			error: {
				type: "validation",
				status: 400,
				message: T("email_storage_rule_never_store_exclusive", { selector }),
			},
			data: undefined,
		};
	}

	const fallback =
		"previewFallback" in value
			? { previewFallback: value.previewFallback }
			: redactRule || neverStoreRule
				? { previewFallback: constants.email.storage.defaultPreviewFallback }
				: {};

	if (neverStoreRule) {
		return {
			error: undefined,
			data: {
				neverStore: true,
				...fallback,
			},
		};
	}

	return {
		error: undefined,
		data: {
			...(encryptRule ? { encrypt: true } : {}),
			...(redactRule ? { redact: true } : {}),
			...fallback,
		} as EmailStorageRule,
	};
};

/**
 * Validates caller storage config so the persisted strategy is deterministic.
 */
export const normalizeEmailStorageConfig = (
	storage?: EmailStorageConfig | null,
): Awaited<ServiceResponse<EmailStorageConfig | null>> => {
	if (storage === undefined || storage === null) {
		return {
			error: undefined,
			data: null,
		};
	}

	const normalized: EmailStorageConfig = {};

	for (const [selector, rule] of Object.entries(storage)) {
		const selectorRes = parseEmailStorageSelector(selector);
		if (selectorRes.error) return selectorRes;

		const ruleRes = normalizeEmailStorageRule(selector, rule);
		if (ruleRes.error) return ruleRes;

		normalized[selector] = ruleRes.data;
	}

	return {
		error: undefined,
		data: Object.keys(normalized).length > 0 ? normalized : null,
	};
};

const getEmailStorageSpecificity = (segments: EmailStoragePathSegment[]) =>
	segments.reduce((total, segment) => {
		if (segment.type === "wildcard") return total + 1;
		return total + 2;
	}, 0);

/**
 * Converts normalized config entries into parsed rules for path transforms.
 */
export const parseEmailStorageRules = (
	storage?: EmailStorageConfig | null,
): Awaited<ServiceResponse<ParsedEmailStorageRule[]>> => {
	const normalizedRes = normalizeEmailStorageConfig(storage);
	if (normalizedRes.error) return normalizedRes;
	if (!normalizedRes.data) {
		return {
			error: undefined,
			data: [],
		};
	}

	const rules: ParsedEmailStorageRule[] = [];

	for (const [selector, rule] of Object.entries(normalizedRes.data)) {
		const selectorRes = parseEmailStorageSelector(selector);
		if (selectorRes.error) return selectorRes;

		rules.push({
			selector,
			rule,
			segments: selectorRes.data,
			index: rules.length,
			specificity: getEmailStorageSpecificity(selectorRes.data),
		});
	}

	return {
		error: undefined,
		data: rules,
	};
};
