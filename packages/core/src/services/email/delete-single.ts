import { copy } from "../../libs/i18n/index.js";
import { EmailsRepository } from "../../libs/repositories/index.js";
import type { LucidActor } from "../../types/hono.js";
import type { ServiceFn } from "../../utils/services/types.js";
import removeTarget from "../document-references/remove-target.js";

/** Deletes one email, including system emails only for super admins, and notifies documents that referenced it. */
const deleteSingle: ServiceFn<
	[
		{
			id: number;
			authUser: LucidActor;
		},
	],
	undefined
> = async (context, data) => {
	const Emails = new EmailsRepository(context.db);

	const emailRes = await Emails.selectSingleById({
		id: data.id,
		includeSystem: data.authUser.superAdmin,
		validation: {
			enabled: true,
			defaultError: {
				message: copy("server:core.email.not.found.message"),
				status: 404,
			},
		},
	});
	if (emailRes.error) return emailRes;

	const deleteEmailRes = await Emails.deleteSingle({
		returning: ["id"],
		where: [
			{
				key: "id",
				operator: "=",
				value: data.id,
			},
		],
		validation: {
			enabled: true,
			defaultError: {
				status: 500,
			},
		},
	});
	if (deleteEmailRes.error) return deleteEmailRes;

	const references = await removeTarget(context, {
		resource: "emails",
		table: "lucid_emails",
		ids: [data.id],
	});
	if (references.error) return references;

	return {
		error: undefined,
		data: undefined,
	};
};

export default deleteSingle;
