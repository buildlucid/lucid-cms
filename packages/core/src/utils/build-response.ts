import type { FastifyRequest } from "fastify";
import type { ResponseBody } from "../types/response.js";

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
	request: FastifyRequest,
	params: BuildResponseParams,
) => ResponseBody;

// --------------------------------------------------
// Helpers

const constructBaseUrl = (request: FastifyRequest): URL => {
	if (request.server.config.host) {
		const originalUrl = request.originalUrl.startsWith("/")
			? request.originalUrl
			: `/${request.originalUrl}`;
		return new URL(originalUrl, request.server.config.host);
	}
	return new URL(
		`${request.protocol}://${request.hostname}${request.originalUrl}`,
	);
};

const getPath = (request: FastifyRequest) => {
	try {
		return constructBaseUrl(request)?.toString().split("?")[0] || "";
	} catch (error) {
		return request.originalUrl || "";
	}
};

const buildMetaLinks = (
	request: FastifyRequest,
	params: BuildResponseParams,
): ResponseBody["meta"]["links"] => {
	const links: ResponseBody["meta"]["links"] = [];
	if (!params.pagination) return links;

	const { page, perPage, count } = params.pagination;
	const totalPages = Math.ceil(count / Number(perPage));

	try {
		const baseUrl = constructBaseUrl(request);

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
	request: FastifyRequest,
	params: BuildResponseParams,
): ResponseBody["links"] => {
	if (!params.pagination) return undefined;

	try {
		const { page, perPage, count } = params.pagination;
		const totalPages = perPage === -1 ? 1 : Math.ceil(count / Number(perPage));
		const baseUrl = constructBaseUrl(request);

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
const formatAPIResponse: FormatAPIResponse = (request, params) => {
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
	console.log("pre meta");
	const meta: ResponseBody["meta"] = {
		path: getPath(request),
		links: buildMetaLinks(request, params),
		currentPage: params.pagination?.page ?? null,
		perPage: params.pagination?.perPage ?? null,
		total: Number(params.pagination?.count) || null,
		lastPage: lastPage,
	};
	console.log("post meta");
	const links = buildLinks(request, params);

	return {
		data: params.data || null,
		meta: meta,
		links,
	};
};

export default formatAPIResponse;
