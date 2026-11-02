import { EmailsRepository } from "../../../libs/repositories/index.js";
import type { ServiceFn } from "../../../utils/services/types.js";

/** Returns emails that still exist, only for files exported from this site. */
const matchEmails: ServiceFn<
	[{ uids: string[]; sameSite: boolean }],
	Map<string, string>
> = async (context, data) => {
	const ids = data.uids.map(Number).filter(Number.isInteger);
	if (!data.sameSite || ids.length === 0) {
		return { error: undefined, data: new Map() };
	}

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

export default matchEmails;
