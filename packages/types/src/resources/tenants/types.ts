import type { AdminCopyDescriptor } from "../locales/types.js";

export type Tenant = {
	key: string;
	name: AdminCopyDescriptor;
	default?: boolean;
};
