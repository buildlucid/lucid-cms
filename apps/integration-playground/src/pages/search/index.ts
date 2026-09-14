import { element } from "../../dom";
import {
	type SearchAuth,
	type SearchQuery,
	type SearchResults,
	searchContent,
} from "./client";

type OAuthSession = {
	accessToken: string;
	resource: string;
	expiresAt: number;
};

export const initializeSearch = (options: {
	getOAuthSession: () => OAuthSession | undefined;
}) => {
	const form = element("search-form", HTMLFormElement);
	const url = element("search-url", HTMLInputElement);
	const auth = element("search-auth", HTMLSelectElement);
	const key = element("search-key", HTMLInputElement);
	const query = element("search-query", HTMLInputElement);
	const source = element("search-source", HTMLSelectElement);
	const selectedSource = () =>
		source.value === "media" ? ("media" as const) : ("pages" as const);
	const locale = element("search-locale", HTMLSelectElement);
	const submit = element("search-submit", HTMLButtonElement);
	const status = element("search-status", HTMLElement);
	const error = element("search-error", HTMLParagraphElement);
	const time = element("search-time", HTMLElement);
	const results = element("search-results", HTMLDivElement);
	const pagination = element("search-pagination", HTMLElement);
	const previous = element("search-previous", HTMLButtonElement);
	const next = element("search-next", HTMLButtonElement);
	const response = element("search-response", HTMLDetailsElement);
	const responseValue = element("search-response-value", HTMLPreElement);
	let controller: AbortController | undefined;
	let currentQuery: SearchQuery | undefined;

	url.value =
		localStorage.getItem("lucid-integration-playground.base-url") ??
		import.meta.env.VITE_LUCID_URL ??
		"http://localhost:6543";

	const showEmpty = (title: string, description: string) => {
		const empty = document.createElement("div");
		empty.className = "empty-state";
		const heading = document.createElement("strong");
		heading.textContent = title;
		const copy = document.createElement("p");
		copy.textContent = description;
		empty.append(heading, copy);
		results.replaceChildren(empty);
	};
	const renderResults = (data: SearchResults) => {
		results.replaceChildren();
		status.textContent = `${data.meta.total} ${data.meta.total === 1 ? "result" : "results"}`;
		if (data.data.length === 0)
			showEmpty(
				"No matching results",
				"Try another query or language, or check that the content is indexed.",
			);
		for (const hit of data.data) {
			const row = document.createElement("article");
			row.className = "search-hit";
			if (hit.kind === "media" && hit.mediaType === "image") {
				const thumbnail = document.createElement("img");
				thumbnail.className = "search-thumbnail";
				thumbnail.src = hit.url;
				thumbnail.alt = "";
				thumbnail.loading = "lazy";
				row.append(thumbnail);
			}
			const content = document.createElement("div");
			content.className = "search-hit-content";
			const title = document.createElement("h3");
			title.textContent =
				hit.title ||
				(hit.kind === "media" ? "Untitled media" : "Untitled page");
			const path = document.createElement("p");
			path.textContent =
				hit.kind === "media" ? hit.url : hit.path || "No page path";
			const language = document.createElement("span");
			language.className = "scope-chip";
			language.textContent = hit.locale === "fr" ? "French" : "English";
			content.append(title, path);
			row.append(content, language);
			results.append(row);
		}
		pagination.hidden = data.meta.lastPage < 2;
		previous.disabled = data.meta.currentPage <= 1;
		next.disabled = data.meta.currentPage >= data.meta.lastPage;
		element("search-page-label", HTMLElement).textContent =
			`Page ${data.meta.currentPage} of ${data.meta.lastPage}`;
	};
	const search = async (searchQuery: SearchQuery) => {
		controller?.abort();
		const active = new AbortController();
		controller = active;
		error.hidden = true;
		pagination.hidden = true;
		response.hidden = true;
		results.setAttribute("aria-busy", "true");
		submit.disabled = true;
		submit.textContent = "Searching…";
		status.textContent = "Searching…";
		time.textContent = "";
		const started = performance.now();
		try {
			if (!url.reportValidity())
				throw new Error("Enter the URL of your Lucid instance.");
			const target = new URL(url.value);
			if (
				!["http:", "https:"].includes(target.protocol) ||
				target.username ||
				target.password
			)
				throw new Error("Use an HTTP or HTTPS URL for your Lucid instance.");
			let credential: SearchAuth;
			if (auth.value === "oauth") {
				const session = options.getOAuthSession();
				if (!session || session.expiresAt <= Date.now())
					throw new Error(
						"Open OAuth setup to connect or refresh your session first.",
					);
				if (new URL(session.resource).origin !== target.origin)
					throw new Error(
						"Your OAuth session belongs to a different Lucid instance.",
					);
				credential = { type: "oauth", accessToken: session.accessToken };
			} else {
				if (!key.value.trim())
					throw new Error("Paste a Lucid integration key to search.");
				credential = { type: "api-key", key: key.value.trim() };
			}
			const result = await searchContent({
				origin: target.origin,
				auth: credential,
				query: searchQuery,
				signal: active.signal,
			});
			if (active.signal.aborted) return;
			currentQuery = searchQuery;
			renderResults(result.results);
			time.textContent = `${Math.round(performance.now() - started)} ms`;
			responseValue.textContent = JSON.stringify(result.body, null, 2);
			response.hidden = false;
		} catch (cause) {
			if (active.signal.aborted) return;
			error.textContent =
				cause instanceof TypeError
					? "Could not reach Lucid. Check the URL, server and CORS configuration."
					: cause instanceof Error
						? cause.message
						: "Search failed. Try again.";
			error.hidden = false;
			status.textContent = "Search failed";
			showEmpty(
				"No results to display",
				"Resolve the connection error and try again.",
			);
		} finally {
			if (!active.signal.aborted) {
				results.setAttribute("aria-busy", "false");
				submit.disabled = false;
				submit.textContent = "Search";
			}
		}
	};
	form.addEventListener("submit", (event) => {
		event.preventDefault();
		if (query.value.trim())
			void search({
				query: query.value.trim(),
				locale: locale.value,
				page: 1,
				source: selectedSource(),
			});
	});
	source.addEventListener("change", () => {
		updateAuthHint();
		if (query.value.trim())
			void search({
				query: query.value.trim(),
				locale: locale.value,
				page: 1,
				source: selectedSource(),
			});
	});
	locale.addEventListener("change", () => {
		if (query.value.trim())
			void search({
				query: query.value.trim(),
				locale: locale.value,
				page: 1,
				source: selectedSource(),
			});
	});
	previous.addEventListener("click", () => {
		if (currentQuery)
			void search({ ...currentQuery, page: currentQuery.page - 1 });
	});
	next.addEventListener("click", () => {
		if (currentQuery)
			void search({ ...currentQuery, page: currentQuery.page + 1 });
	});
	const updateAuthHint = () => {
		const oauth = auth.value === "oauth";
		element("search-key-field", HTMLElement).hidden = oauth;
		element("search-auth-hint", HTMLElement).textContent = oauth
			? "Uses the active OAuth session from the OAuth page. Choose the same Lucid instance."
			: `Use a key with permission to read ${selectedSource() === "media" ? "media" : "the page collection"}. The key stays in this tab.`;
	};
	auth.addEventListener("change", updateAuthHint);
};
