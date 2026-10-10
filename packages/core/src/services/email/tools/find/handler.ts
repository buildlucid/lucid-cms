import type z from "zod";
import type { ToolkitActor } from "../../../../libs/toolkit/types.js";
import { getPagination } from "../../../../libs/tools/pagination.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import resolveActorUser from "../../../users/helpers/resolve-actor-user.js";
import getMultiple from "../../get-multiple.js";
import type { inputSchema, outputSchema } from "./schema.js";

/** Lists emails the actor could see in the admin, which includes system emails for super admins. */
const findEmails: ServiceFn<
	[{ input: z.output<typeof inputSchema>; actor: ToolkitActor }],
	{ output: z.output<typeof outputSchema> }
> = async (context, props) => {
	const { query } = props.input;
	const userRes = await resolveActorUser(context, { actor: props.actor });
	if (userRes.error) return userRes;

	const emailsRes = await getMultiple(context, {
		query,
		authUser: userRes.data,
	});
	if (emailsRes.error) return emailsRes;

	return {
		error: undefined,
		data: {
			output: {
				data: emailsRes.data.data.map(
					({
						data: _data,
						attachments: _attachments,
						html: _html,
						resend: _resend,
						...email
					}) => email,
				),
				pagination: getPagination(
					emailsRes.data.count,
					query.page,
					query.perPage,
				),
			},
		},
	};
};

export default findEmails;
