import type { ResponseBody, UserPreferences } from "@types";
import request from "@/utils/request";

/** Saves supplied top-level preferences, replacing their stored values. */
export const updatePreferencesReq = (preferences: UserPreferences) =>
	request<ResponseBody<undefined>>({
		url: "/api/v1/account/preferences",
		csrf: true,
		method: "PATCH",
		body: preferences,
	});
