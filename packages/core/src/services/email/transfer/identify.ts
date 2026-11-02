import { EmailsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Returns email IDs as their own identities. Sent emails are records of this site, so they only match on it. */
const identifyEmails: ServiceFn<
	[{ ids: string[] }],
	Map<string, string>
> = async (context, data) => {
	const ids = data.ids.map(Number).filter(Number.isInteger);
	if (ids.length === 0) return { error: undefined, data: new Map() };

	const Emails = new EmailsRepository(context.db);
	const emailsRes = await Emails.selectMultiple({
		select: ["id"],
		where: [
			{ key: "id", operator: "in", value: ids },
			{ key: "is_system", operator: "=", value: false },
		],
		validation: { enabled: true },
	});
	if (emailsRes.error) return emailsRes;

	return {
		error: undefined,
		data: new Map(
			emailsRes.data.map((email) => [String(email.id), String(email.id)]),
		),
	};
};

export default identifyEmails;
