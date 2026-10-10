import type z from "zod";
import type { ToolkitActor } from "../../../../libs/toolkit/types.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import resolveActorUser from "../../../users/helpers/resolve-actor-user.js";
import getSingle from "../../get-single.js";
import getTransactions from "../../get-transactions.js";
import { EMAIL_DELIVERIES, EMAIL_HTML_CHARS } from "../constants.js";
import type { inputSchema, outputSchema } from "./schema.js";

/** Reads one email the actor can see with its latest delivery attempts, rendering its HTML only when asked. */
const getEmail: ServiceFn<
	[{ input: z.output<typeof inputSchema>; actor: ToolkitActor }],
	{ output: z.output<typeof outputSchema> }
> = async (context, { input, actor }) => {
	const userRes = await resolveActorUser(context, { actor });
	if (userRes.error) return userRes;

	const [emailRes, deliveriesRes] = await Promise.all([
		getSingle(context, {
			id: input.emailId,
			renderTemplate: input.includeHtml,
			authUser: userRes.data,
		}),
		getTransactions(context, {
			emailId: input.emailId,
			query: {
				sort: [{ key: "createdAt", direction: "desc" }],
				page: 1,
				perPage: EMAIL_DELIVERIES,
			},
			authUser: userRes.data,
		}),
	]);
	if (emailRes.error) return emailRes;
	if (deliveriesRes.error) return deliveriesRes;

	const { html, resend, attachments, ...email } = emailRes.data;
	const htmlTruncated = html !== null && html.length > EMAIL_HTML_CHARS;

	return {
		error: undefined,
		data: {
			output: {
				data: {
					...email,
					attachments: attachments.map(({ filename, contentType }) => ({
						filename,
						contentType,
					})),
					resendable: resend.enabled,
					html: htmlTruncated ? html.slice(0, EMAIL_HTML_CHARS) : html,
					htmlTruncated,
					deliveries: deliveriesRes.data.data.map(
						({ emailId: _emailId, strategyData: _strategyData, ...delivery }) =>
							delivery,
					),
				},
			},
		},
	};
};

export default getEmail;
