import type { PreviewResolution, PreviewRuntimeState } from "@lucidcms/types";
import { lucidMountPath } from "./constants.js";
import { detectBrowserPreview } from "./context.js";

type PreviewResolutionResponse = {
	data: PreviewResolution;
};

const parsePreviewResolutionResponse = (
	value: unknown,
): PreviewResolutionResponse["data"] => {
	if (typeof value !== "object" || value === null || !("data" in value)) {
		throw new TypeError("Lucid preview response did not include data.");
	}
	const data = value.data;
	if (
		typeof data !== "object" ||
		data === null ||
		!("mode" in data) ||
		(data.mode !== "perspective" && data.mode !== "scoped") ||
		!("expiresAt" in data) ||
		typeof data.expiresAt !== "string" ||
		!Number.isFinite(new Date(data.expiresAt).getTime())
	) {
		throw new TypeError("Lucid preview response was invalid.");
	}

	return { mode: data.mode, expiresAt: data.expiresAt };
};

const fetchPreview = async (
	targetWindow: Window,
	host: URL,
	token: string,
	signal: AbortSignal,
): Promise<Extract<PreviewRuntimeState, { kind: "preview" }>> => {
	const response = await targetWindow.fetch(
		new URL(`${lucidMountPath}/api/v1/content/preview`, host),
		{
			method: "POST",
			credentials: "omit",
			headers: {
				Accept: "application/json",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ token }),
			referrerPolicy: "no-referrer",
			signal,
		},
	);
	if (!response.ok) {
		throw new Error(`Lucid preview resolution failed with ${response.status}.`);
	}

	const payload: unknown = await response.json();
	const resolved = parsePreviewResolutionResponse(payload);
	return { kind: "preview", token, ...resolved };
};

/** Resolves browser-owned preview state. */
export const resolveBrowserPreview = async ({
	targetWindow,
	host,
	url,
	signal,
}: {
	targetWindow: Window;
	host: URL;
	url: URL;
	signal: AbortSignal;
}): Promise<PreviewRuntimeState> => {
	const candidate = detectBrowserPreview(targetWindow, host, url);
	switch (candidate.kind) {
		case "published":
			return { kind: "published" };
		case "preview":
			return candidate.preview;
		case "invalid":
			throw new TypeError("The Lucid preview token is invalid.");
		case "token": {
			const preview = await fetchPreview(
				targetWindow,
				host,
				candidate.token,
				signal,
			);
			return preview;
		}
		default: {
			const _exhaustive: never = candidate;
			return _exhaustive;
		}
	}
};
