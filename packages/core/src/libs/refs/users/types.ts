import type { UserPropT } from "../../formatters/users.js";
import type { MediaDeliveryAdapterInstance } from "../../media-delivery/types.js";
import type { RefResourceTargets } from "../types.js";

export type UserRefData = UserPropT[];

export type UserRefResolveInput = {
	targets: RefResourceTargets;
	format: {
		host: string;
		mediaDelivery: MediaDeliveryAdapterInstance;
	};
};
