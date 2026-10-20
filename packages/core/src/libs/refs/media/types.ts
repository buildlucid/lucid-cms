import type { MediaActor } from "../../../utils/media/index.js";
import type { MediaPropsT } from "../../formatters/media.js";
import type { MediaDeliveryAdapterInstance } from "../../media-delivery/types.js";
import type { RefResourceTargets } from "../types.js";

export type MediaRefData = MediaPropsT[];

export type MediaRefResolveInput = {
	targets: RefResourceTargets;
	/** Content API refs only include library media. */
	actor: MediaActor;
	format: {
		host: string;
		defaultLocale: string | null;
		locales: { code: string }[];
		mediaDelivery: MediaDeliveryAdapterInstance;
	};
};
