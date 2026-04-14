const PAGE_COLLECTION_KEY = "page";
const PAGE_STATUS = "latest";

const clientBaseUrl = "http://localhost:5173/";
const clientApiKey =
	"Yjc1NzIzOjkyMzEyZjkwYjQ4MTFiOTU4MTI1NTBhNzRjMTgzMzY0ZGIxMDU3OTE0Y2VlODg0Y2FiODdjNDA1NzNlNzA1YmQ=";

type LucidField = {
	value?: unknown;
};

type LucidClientDocument = {
	id: number;
	fields?: Record<string, LucidField> | null;
};

export type PlaygroundPage = {
	id: number;
	fullSlug: string;
	title: string;
	body: string;
};

const getFieldValue = (
	document: LucidClientDocument,
	key: string,
): string | null => {
	const value = document.fields?.[key]?.value;
	return typeof value === "string" ? value : null;
};

const mapPageDocument = (document: LucidClientDocument): PlaygroundPage => {
	const fullSlug = getFieldValue(document, "fullSlug") ?? "/";

	return {
		id: document.id,
		fullSlug,
		title: getFieldValue(document, "page_title") ?? "Untitled page",
		body:
			getFieldValue(document, "page_body") ??
			"This page was loaded through the Lucid client document endpoint.",
	};
};

const getClientConfig = (): { baseUrl: string; apiKey: string } => {
	if (!clientBaseUrl) {
		throw new Error(
			"The Astro playground requires `LUCID_CLIENT_BASE_URL` or `PUBLIC_LUCID_CLIENT_BASE_URL` to query Lucid client document endpoints.",
		);
	}

	if (!clientApiKey) {
		throw new Error(
			"The Astro playground requires `LUCID_CLIENT_API_KEY` or `PUBLIC_LUCID_CLIENT_API_KEY` to query Lucid client document endpoints.",
		);
	}

	return {
		baseUrl: clientBaseUrl,
		apiKey: clientApiKey,
	};
};

const requestLucidClientEndpoint = async (
	pathname: string,
	searchParams?: URLSearchParams,
): Promise<Response> => {
	const { baseUrl, apiKey } = getClientConfig();
	const url = new URL(pathname, baseUrl);

	if (searchParams) {
		url.search = searchParams.toString();
	}

	return fetch(url, {
		headers: {
			Authorization: apiKey,
		},
	});
};

export const getAllPages = async (): Promise<PlaygroundPage[]> => {
	const searchParams = new URLSearchParams({
		perPage: "100",
		sort: "updatedAt",
	});
	const response = await requestLucidClientEndpoint(
		`/lucid/api/v1/client/documents/${PAGE_COLLECTION_KEY}/${PAGE_STATUS}`,
		searchParams,
	);

	if (!response.ok) {
		throw new Error(
			`Lucid client documents request failed with ${response.status}.`,
		);
	}

	const payload = (await response.json()) as {
		data: LucidClientDocument[];
	};
	const uniquePages = new Map<string, PlaygroundPage>();

	for (const page of payload.data.map(mapPageDocument)) {
		if (page.fullSlug !== "/" && !page.fullSlug.startsWith("/")) {
			continue;
		}

		if (!uniquePages.has(page.fullSlug)) {
			uniquePages.set(page.fullSlug, page);
		}
	}

	return [...uniquePages.values()];
};

export const getPageByFullSlug = async (
	fullSlug: string,
): Promise<PlaygroundPage | null> => {
	const searchParams = new URLSearchParams();
	searchParams.set("filter[_fullSlug]", fullSlug);

	const response = await requestLucidClientEndpoint(
		`/lucid/api/v1/client/document/${PAGE_COLLECTION_KEY}/${PAGE_STATUS}`,
		searchParams,
	);

	if (response.status === 404) {
		return null;
	}

	if (!response.ok) {
		throw new Error(
			`Lucid client document request failed with ${response.status}.`,
		);
	}

	const payload = (await response.json()) as {
		data: LucidClientDocument;
	};

	return mapPageDocument(payload.data);
};
