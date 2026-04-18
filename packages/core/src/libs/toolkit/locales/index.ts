import type { LocalesResponse } from "../../../types/response.js";
import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import getAll from "./get-all.js";

export type ToolkitLocales = {
	/** Returns all enabled locales. */
	getAll: () => ServiceResponse<LocalesResponse[]>;
};

/** Creates locale helpers for a toolkit instance. */
export const createLocalesToolkit = (
	context: ServiceContext,
): ToolkitLocales => ({
	getAll: () => getAll(context),
});

export default createLocalesToolkit;
