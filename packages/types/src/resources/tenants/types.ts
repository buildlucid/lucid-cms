import type { ResolvedAdminCopy } from "../locales/types.js";

export type Tenant = {
	key: string;
	name: ResolvedAdminCopy;
	default?: boolean;
};
