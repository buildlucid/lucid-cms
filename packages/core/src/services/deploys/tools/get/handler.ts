import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import type { ToolkitActor } from "../../../../libs/permission/toolkit-actor.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import resolveActorUser from "../../../users/helpers/resolve-actor-user.js";
import getMultiple from "../../get-multiple.js";
import type { inputSchema, outputSchema } from "./schema.js";

//* listings stay short, and one deploy keeps the history the admin shows
const listedRuns = 5;

/** Reads the deploys the actor can view, or one of them with its recent runs. */
const getDeploys: ServiceFn<
	[{ input: z.output<typeof inputSchema>; actor: ToolkitActor }],
	{ output: z.output<typeof outputSchema> }
> = async (context, props) => {
	const actor = await resolveActorUser(context, { actor: props.actor });
	if (actor.error) return actor;

	const deploys = await getMultiple(context, { actor: actor.data });
	if (deploys.error) return deploys;

	const { key } = props.input;
	if (key === undefined) {
		return {
			error: undefined,
			data: {
				output: {
					data: deploys.data.map(({ webhookUrl: _, ...deploy }) => ({
						...deploy,
						recentRuns: deploy.recentRuns.slice(0, listedRuns),
					})),
				},
			},
		};
	}

	const deploy = deploys.data.find((item) => item.key === key);
	if (!deploy) {
		return {
			error: {
				type: "basic",
				status: 404,
				message: copy("server:core.deploys.not.found", {
					data: { deploy: key },
				}),
			},
			data: undefined,
		};
	}

	const { webhookUrl: _, ...output } = deploy;
	return { error: undefined, data: { output: { data: [output] } } };
};

export default getDeploys;
