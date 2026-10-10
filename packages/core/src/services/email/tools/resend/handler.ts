import type z from "zod";
import type { ToolkitActor } from "../../../../libs/toolkit/types.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import resolveActorUser from "../../../users/helpers/resolve-actor-user.js";
import resendSingle from "../../resend-single.js";
import type { inputSchema, outputSchema } from "./schema.js";

/** Queues a stored email the actor can see to send again. */
const resendEmail: ServiceFn<
	[z.output<typeof inputSchema> & { actor: ToolkitActor }],
	{ output: z.output<typeof outputSchema> }
> = async (context, props) => {
	const userRes = await resolveActorUser(context, { actor: props.actor });
	if (userRes.error) return userRes;

	const resendRes = await resendSingle(context, {
		id: props.emailId,
		authUser: userRes.data,
	});
	if (resendRes.error) return resendRes;

	return {
		error: undefined,
		data: { output: { job: { id: resendRes.data.jobId } } },
	};
};

export default resendEmail;
