import { createResource, createSignal, For, onMount, Show } from "solid-js";

type SearchHit = {
	id: string;
	title?: string;
	path?: string;
};

/** Searches published pages via the public `/api/v1/content/site-search` route; the form submits `?q=` without JavaScript for the island to read on load. */
export default function Search(props: {
	locale: string;
	labels: {
		field: string;
		submit: string;
		searching: string;
		empty: string;
		failed: string;
	};
}) {
	const [query, setQuery] = createSignal("");
	const [results] = createResource(
		() => query() || false,
		async (value) => {
			const url = new URL("/api/v1/content/site-search", location.origin);
			url.search = new URLSearchParams({
				query: value,
				locale: props.locale,
			}).toString();
			const response = await fetch(url, {
				headers: { Accept: "application/json" },
			});
			if (!response.ok) throw new Error(props.labels.failed);
			const body: { data: SearchHit[] } = await response.json();
			return body.data;
		},
	);

	onMount(() => {
		setQuery(new URLSearchParams(location.search).get("q")?.trim() ?? "");
	});

	const submit = (event: SubmitEvent & { currentTarget: HTMLFormElement }) => {
		event.preventDefault();
		const value = String(new FormData(event.currentTarget).get("q")).trim();
		history.replaceState(
			null,
			"",
			value ? `?q=${encodeURIComponent(value)}` : location.pathname,
		);
		setQuery(value);
	};

	return (
		<div class="search">
			<search>
				<form class="search__form" onSubmit={submit}>
					<label class="visually-hidden" for="search-query">
						{props.labels.field}
					</label>
					<input
						id="search-query"
						name="q"
						type="search"
						value={query()}
						placeholder={props.labels.field}
						required
					/>
					<button type="submit">{props.labels.submit}</button>
				</form>
			</search>
			<div aria-live="polite">
				<Show when={results.loading}>
					<p>{props.labels.searching}</p>
				</Show>
				<Show when={results.error}>
					<p>{props.labels.failed}</p>
				</Show>
				<Show when={!results.loading && !results.error && results()}>
					{(hits) => (
						<Show
							when={hits().length > 0}
							fallback={<p>{props.labels.empty}</p>}
						>
							<ul class="search__results">
								<For each={hits()}>
									{(hit) => (
										<li>
											<a href={hit.path}>{hit.title || hit.path}</a>
										</li>
									)}
								</For>
							</ul>
						</Show>
					)}
				</Show>
			</div>
		</div>
	);
}
