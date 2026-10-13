import { UserPreferencesRepository } from "../../libs/repositories/index.js";
import type { UserPreferences } from "../../types/response.js";
import type { ServiceFn } from "../../utils/services/types.js";
import parseUserPreferences from "./helpers/parse-user-preferences.js";

/** Replaces the given top-level preferences and keeps the rest that are still valid. */
const updatePreferences: ServiceFn<
	[
		{
			userId: number;
			preferences: UserPreferences;
		},
	],
	undefined
> = async (context, data) => {
	const Preferences = new UserPreferencesRepository(context.db);

	const currentRes = await Preferences.selectSingle({
		select: ["preferences"],
		where: [{ key: "user_id", operator: "=", value: data.userId }],
	});
	if (currentRes.error) return currentRes;

	const upsertRes = await Preferences.upsertSingle({
		userId: data.userId,
		preferences: {
			...parseUserPreferences(currentRes.data?.preferences),
			...data.preferences,
		},
	});
	if (upsertRes.error) return upsertRes;

	return { error: undefined, data: undefined };
};

export default updatePreferences;
