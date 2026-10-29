import type { AgentRef } from "../agent/types.js";
import type {
	DocumentFieldMap,
	DocumentFieldValueMap,
	DocumentRef,
} from "../documents/types.js";
import type { EmailRef } from "../emails/types.js";
import type { MediaRef } from "../media/types.js";
import type { UserRef } from "../users/types.js";
import type { RefResource } from "./resource.js";

export type { RefResource } from "./resource.js";

export interface RefResourceMap {
	documents: DocumentRef<
		string,
		DocumentFieldMap | DocumentFieldValueMap | null
	>;
	media: NonNullable<MediaRef>;
	users: NonNullable<UserRef>;
	emails: EmailRef;
	agents: AgentRef;
}

/** Referenced resources returned alongside response data. */
export type Refs = {
	[TResource in RefResource]?: RefResourceMap[TResource][];
};
