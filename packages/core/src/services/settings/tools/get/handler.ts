import type z from "zod";
import type { ToolkitActor } from "../../../../libs/toolkit/types.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import resolveActorUser from "../../../users/helpers/resolve-actor-user.js";
import getSettings from "../../get-settings.js";
import type { inputSchema, outputSchema } from "./schema.js";

const getSettingsForTool: ServiceFn<
	[{ input: z.output<typeof inputSchema>; actor: ToolkitActor }],
	{ output: z.output<typeof outputSchema> }
> = async (context, props) => {
	const userRes = await resolveActorUser(context, { actor: props.actor });
	if (userRes.error) return userRes;

	const settingsRes = await getSettings(context, {
		includes: props.input.includes,
		authUser: userRes.data,
	});
	if (settingsRes.error) return settingsRes;

	return { error: undefined, data: { output: { data: settingsRes.data } } };
};

export default getSettingsForTool;
