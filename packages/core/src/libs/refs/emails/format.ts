import type { EmailRef } from "../../../exports/types.js";
import formatter from "../../formatters/helpers.js";
import type { EmailRefData, EmailRefResolveInput } from "./types.js";

const formatEmailRefs = (
	rows: EmailRefData,
	context: EmailRefResolveInput["format"],
): EmailRef[] =>
	rows.map((email) => ({
		id: email.id,
		subject: email.subject,
		template: email.template,
		from: {
			address: email.from_address,
			name: email.from_name,
		},
		...(context.delivery
			? {
					to: email.to_address,
					cc: email.cc,
					bcc: email.bcc,
					currentStatus: email.current_status,
				}
			: {}),
		createdAt: formatter.formatDate(email.created_at),
	}));

export default formatEmailRefs;
