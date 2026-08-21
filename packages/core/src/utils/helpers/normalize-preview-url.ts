import { copy } from "../../libs/i18n/index.js";
import type { ServiceResponse } from "../services/types.js";

/** Resolves a collection route against the CMS origin without allowing the path to replace it. */
export const resolveDefaultPreviewUrl = (
	baseUrl: string,
	path: string | null,
): URL | null => {
	if (!path) return null;

	const url = new URL("/", baseUrl);
	url.pathname = path.startsWith("/") ? path : `/${path}`;
	return url;
};

const normalizePreviewUrl = async (
	resolved: string | URL | null,
	token: string,
): ServiceResponse<string | null> => {
	if (resolved === null) {
		return {
			error: undefined,
			data: null,
		};
	}

	let url: URL;
	try {
		url = new URL(resolved instanceof URL ? resolved.toString() : resolved);
	} catch {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.preview.url.invalid.message"),
				status: 400,
			},
			data: undefined,
		};
	}

	if (url.protocol !== "http:" && url.protocol !== "https:") {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.preview.url.invalid.message"),
				status: 400,
			},
			data: undefined,
		};
	}

	url.searchParams.set("preview", token);
	return {
		error: undefined,
		data: url.toString(),
	};
};

export default normalizePreviewUrl;
