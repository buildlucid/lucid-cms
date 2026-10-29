import type { LucidEmails } from "../../db/tables/index.js";
import type { Select } from "../../db/types.js";
import type { RefResourceTargets } from "../types.js";

export type EmailRefData = Array<
	Pick<
		Select<LucidEmails>,
		| "id"
		| "from_address"
		| "from_name"
		| "to_address"
		| "cc"
		| "bcc"
		| "subject"
		| "template"
		| "current_status"
		| "created_at"
	>
>;

export type EmailRefResolveInput = {
	targets: RefResourceTargets;
	format: {
		/** Whether refs carry recipients and delivery status, which only the admin shows. */
		delivery: boolean;
	};
};
