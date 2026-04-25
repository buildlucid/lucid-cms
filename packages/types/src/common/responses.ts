import type { ErrorResult } from "./errors.js";

export type ResponseMetaLink = {
	active: boolean;
	label: string;
	url: string | null;
	page: number;
};

export interface ResponseBody<D = unknown> {
	data: D;
	links?: {
		first: string | null;
		last: string | null;
		next: string | null;
		prev: string | null;
	};
	meta: {
		links: ResponseMetaLink[];
		path: string;
		currentPage: number | null;
		lastPage: number | null;
		perPage: number | null;
		total: number | null;
	};
}

export interface ErrorResponse {
	status: number;
	code?: string;
	name: string;
	message: string;
	errors?: ErrorResult;
}
