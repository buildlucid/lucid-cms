import type { EmailRefData } from "../../libs/refs/emails/types.js";
import type { RefResourceTargets } from "../../libs/refs/types.js";
import { EmailsRepository } from "../../libs/repositories/index.js";
import type { ServiceFn } from "../../utils/services/types.js";

/** Reads referenced emails without system notifications, leaving each field's type restrictions to validation when values are saved. */
const getEmailRefs: ServiceFn<
	[{ targets: RefResourceTargets }],
	EmailRefData
> = async (context, data) => {
	const ids = Array.from(
		new Set(
			Array.from(data.targets.values()).flatMap((values) =>
				Array.from(values).filter(
					(value): value is number => typeof value === "number",
				),
			),
		),
	);
	if (ids.length === 0) return { data: [], error: undefined };

	const Emails = new EmailsRepository(context.db);
	const emailsRes = await Emails.selectMultiple({
		select: [
			"id",
			"from_address",
			"from_name",
			"to_address",
			"cc",
			"bcc",
			"subject",
			"template",
			"current_status",
			"created_at",
		],
		where: [
			{
				key: "id",
				operator: "in",
				value: ids,
			},
			{
				key: "is_system",
				operator: "=",
				value: context.config.db.getDefault("boolean", "false"),
			},
		],
		validation: {
			enabled: true,
		},
	});
	if (emailsRes.error) return emailsRes;

	return {
		error: undefined,
		data: emailsRes.data,
	};
};

export default getEmailRefs;
