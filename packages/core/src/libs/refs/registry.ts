import type { RefResource } from "../../types.js";
import { refResourceKeys } from "./constants.js";
import documentRefResource from "./documents/index.js";
import mediaRefResource from "./media/index.js";
import userRefResource from "./users/index.js";

const registeredRefResources = {
	documents: documentRefResource,
	media: mediaRefResource,
	users: userRefResource,
} as const satisfies {
	[TResource in RefResource]: { resource: TResource };
};

export const isRefResource = (value: string): value is RefResource =>
	refResourceKeys.some((resource) => resource === value);

export default registeredRefResources;
