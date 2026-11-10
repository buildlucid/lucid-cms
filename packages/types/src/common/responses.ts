import type { ContentPagination } from "../resources/content/types.js";
import type { ErrorResult } from "./errors.js";

export interface ResponseBody<D = unknown, R = never> {
	data: D;
	refs?: [R] extends [never] ? never : R;
	/** Where a page of a list is. Responses that aren't paginated leave it out. */
	pagination?: ContentPagination;
}

export interface ErrorResponse {
	status: number;
	code?: string;
	key?: string;
	name: string;
	message: string;
	errors?: ErrorResult;
}
