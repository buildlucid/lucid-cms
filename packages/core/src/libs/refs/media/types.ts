import type { MediaPropsT } from "../../formatters/media.js";
import type { MediaDeliveryAdapterInstance } from "../../media-delivery/types.js";
import type { RefResourceTargets } from "../types.js";

export type MediaRefData = MediaPropsT[];

export type MediaRefResolveInput = {
	targets: RefResourceTargets;
	format: {
		host: string;
		defaultLocale: string | null;
		locales: { code: string }[];
		mediaDelivery: MediaDeliveryAdapterInstance;
	};
};
