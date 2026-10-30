import { emailsTable } from "../../../../db/tables/index.js";
import type { CanLinkTarget } from "../../types.js";
import type { EmailValidationData } from "./types.js";

/** Leaves out the emails `canLink` refuses. */
const restrictEmailValidationData = (
	emails: EmailValidationData[],
	canLink: CanLinkTarget,
) =>
	emails.filter((email) =>
		canLink({ resource: "emails", table: emailsTable.name, value: email.id }),
	);

export default restrictEmailValidationData;
