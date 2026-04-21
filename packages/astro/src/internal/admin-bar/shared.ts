import astroConstants from "../../constants.js";
import type {
	LucidAstroAdminBarContext,
	LucidAstroAdminBarEditLink,
	LucidAstroAdminBarOptions,
} from "../../types.js";

export type NormalizedLucidAdminBarOptions =
	Required<LucidAstroAdminBarOptions>;

const defaultEditLabel = "Edit document";

/**
 * Keeps the admin bar config on one predictable shape for the integration and
 * middleware runtime.
 */
export const normalizeLucidAdminBarOptions = (
	options?: LucidAstroAdminBarOptions,
): NormalizedLucidAdminBarOptions => ({
	disable: options?.disable ?? astroConstants.defaults.adminBar.disable,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

const normalizeOptionalString = (value: unknown): string | undefined => {
	if (typeof value !== "string") {
		return undefined;
	}

	const trimmedValue = value.trim();
	return trimmedValue.length > 0 ? trimmedValue : undefined;
};

/**
 * Reads request-local admin bar metadata from Astro locals without trusting
 * arbitrary values.
 */
export const readLucidAdminBarContext = (
	locals: unknown,
): LucidAstroAdminBarContext | null => {
	if (!isRecord(locals)) return null;

	const value = locals[astroConstants.integration.adminBarLocalsKey];
	if (!isRecord(value)) return null;

	const edit = value.edit;
	if (!isRecord(edit)) {
		return {};
	}

	if (
		typeof edit.collectionKey !== "string" ||
		typeof edit.documentId !== "number" ||
		!Number.isInteger(edit.documentId)
	) {
		return {};
	}

	return {
		edit: {
			collectionKey: edit.collectionKey,
			documentId: edit.documentId,
			status:
				typeof edit.status === "string"
					? (edit.status as LucidAstroAdminBarEditLink["status"])
					: undefined,
			versionId:
				typeof edit.versionId === "number" && Number.isInteger(edit.versionId)
					? edit.versionId
					: undefined,
			label: normalizeOptionalString(edit.label),
		},
	};
};

const encodePathSegment = (value: string): string => encodeURIComponent(value);

/**
 * Builds a Lucid edit URL from request-local metadata and encodes dynamic path
 * segments so generated links stay well-formed.
 */
export const buildLucidAdminBarEditHref = (
	edit?: LucidAstroAdminBarEditLink,
): string | null => {
	if (!edit?.collectionKey || !Number.isInteger(edit.documentId)) {
		return null;
	}

	const encodedCollectionKey = encodePathSegment(edit.collectionKey);

	if (edit.status === "revision") {
		if (!Number.isInteger(edit.versionId)) {
			return null;
		}

		return `${astroConstants.paths.mountPath}/collections/${encodedCollectionKey}/revision/${edit.documentId}/${edit.versionId}`;
	}

	return `${astroConstants.paths.mountPath}/collections/${encodedCollectionKey}/${encodePathSegment(edit.status ?? "latest")}/${edit.documentId}`;
};

/**
 * Normalizes the edit action label so both Lucid admin bar UIs can share one
 * default action name.
 */
export const resolveLucidAdminBarEditLabel = (
	edit?: LucidAstroAdminBarEditLink,
): string => edit?.label ?? defaultEditLabel;
