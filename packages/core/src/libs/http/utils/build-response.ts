import type { Context } from "hono";
import type { ResponseBody } from "../../../types/response.js";

// --------------------------------------------------
// Types
interface BuildResponseParams {
	data: unknown;
	pagination?: {
		count: number;
		page: number;
		perPage: number;
	};
}

type FormatAPIResponse = (
	c: Context,
	params: BuildResponseParams,
) => ResponseBody;

// --------------------------------------------------
// Helpers

const constructBaseUrl = (c: Context): URL => {
	const url = new URL(c.req.url);
	return url;
};

const getPath = (c: Context) => {
	try {
		const url = constructBaseUrl(c);
		return url.toString().split("?")[0] || "";
	} catch (error) {
		return c.req.url || "";
	}
};

const buildMetaLinks = (
	c: Context,
	params: BuildResponseParams,
): ResponseBody["meta"]["links"] => {
	const links: ResponseBody["meta"]["links"] = [];
	if (!params.pagination) return links;

	const { page, perPage, count } = params.pagination;
	const totalPages = Math.ceil(count / Number(perPage));

	try {
		const baseUrl = constructBaseUrl(c);

		for (let i = 0; i < totalPages; i++) {
			const pageUrl = new URL(baseUrl.toString());
			if (i !== 0) pageUrl.searchParams.set("page", String(i + 1));
			else pageUrl.searchParams.delete("page");

			links.push({
				active: page === i + 1,
				label: String(i + 1),
				url: pageUrl.toString(),
				page: i + 1,
			});
		}
		return links;
	} catch (error) {
		console.error("Error in buildMetaLinks:", error);
		return links;
	}
};

const buildLinks = (
	c: Context,
	params: BuildResponseParams,
): ResponseBody["links"] => {
	if (!params.pagination) return undefined;

	try {
		const { page, perPage, count } = params.pagination;
		const totalPages = perPage === -1 ? 1 : Math.ceil(count / Number(perPage));
		const baseUrl = constructBaseUrl(c);

		const links: ResponseBody["links"] = {
			first: null,
			last: null,
			next: null,
			prev: null,
		};

		// Set First
		const firstUrl = new URL(baseUrl.toString());
		firstUrl.searchParams.delete("page");
		links.first = firstUrl.toString();

		// Set Last
		const lastUrl = new URL(baseUrl.toString());
		if (page !== totalPages)
			lastUrl.searchParams.set("page", String(totalPages));
		links.last = lastUrl.toString();

		// Set Next
		if (page !== totalPages) {
			const nextUrl = new URL(baseUrl.toString());
			nextUrl.searchParams.set("page", String(Number(page) + 1));
			links.next = nextUrl.toString();
		}

		// Set Prev
		if (page !== 1) {
			const prevUrl = new URL(baseUrl.toString());
			prevUrl.searchParams.set("page", String(Number(page) - 1));
			links.prev = prevUrl.toString();
		}

		return links;
	} catch (error) {
		console.error("Error in buildLinks:", error);
		return undefined; // Return undefined on error
	}
};

// --------------------------------------------------
// Main
const formatAPIResponse: FormatAPIResponse = (c, params) => {
	let lastPage = null;

	if (params.pagination) {
		if (params.pagination.perPage === -1) {
			lastPage = 1;
		} else {
			lastPage = Math.ceil(
				params.pagination.count / Number(params.pagination.perPage),
			);
		}
	}
	const meta: ResponseBody["meta"] = {
		path: getPath(c),
		links: buildMetaLinks(c, params),
		currentPage: params.pagination?.page ?? null,
		perPage: params.pagination?.perPage ?? null,
		total: Number(params.pagination?.count) || null,
		lastPage: lastPage,
	};
	const links = buildLinks(c, params);

	return {
		data: params.data || null,
		meta: meta,
		links,
	};
};

export default formatAPIResponse;
