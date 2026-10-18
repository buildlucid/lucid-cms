import type { UserPropT } from "../../formatters/users.js";
import type { MediaDeliveryAdapterInstance } from "../../media-delivery/types.js";
import type { RefResourceTargets } from "../types.js";

export type UserRefData = UserPropT[];

export type UserRefResolveInput = {
	targets: RefResourceTargets;
	format: {
		host: string;
		defaultLocale: string | null;
		locales: { code: string }[];
		mediaDelivery: MediaDeliveryAdapterInstance;
		/** Whether refs carry the user's email, which only the admin shows. */
		email: boolean;
	};
};
