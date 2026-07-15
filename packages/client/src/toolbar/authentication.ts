import { lucidMountPath } from "./constants.js";
import type { ToolbarOptions } from "./types.js";

/** Parses declarative toolbar authentication state. */
export const parseToolbarAuthentication = (
	value: string | null | undefined,
): boolean | undefined => {
	switch (value?.trim().toLowerCase()) {
		case "authenticated":
			return true;
		case "unauthenticated":
			return false;
		default:
			return undefined;
	}
};

/** Checks Lucid browser-session cookies without refreshing them. */
export const checkToolbarAuthentication = async (
	targetWindow: Window,
	host: URL,
): Promise<boolean> => {
	try {
		const response = await targetWindow.fetch(
			new URL(`${lucidMountPath}/api/v1/auth/status`, host),
			{
				credentials: "include",
				headers: { Accept: "application/json" },
				referrerPolicy: "no-referrer",
			},
		);
		return response.status === 204;
	} catch {
		return false;
	}
};

/** Resolves an explicit, callback, or browser-derived authentication state. */
export const resolveToolbarAuthentication = async (
	targetWindow: Window,
	host: URL,
	authentication: ToolbarOptions["authentication"],
): Promise<boolean> => {
	if (typeof authentication === "boolean") return authentication;
	if (typeof authentication === "function") return authentication();
	return checkToolbarAuthentication(targetWindow, host);
};
