import {
	pagination,
	sort,
	textFilter,
	Permissions,
	usePermissions,
	useQueryState,
	useSession,
	useTranslation,
} from "@lucidcms/admin/hooks";
import { queries, queryKeys } from "@lucidcms/admin/services";
import type { RouteComponent } from "@lucidcms/admin/types";
import { toast } from "@lucidcms/admin/utils";
import { useQuery, useQueryClient } from "@tanstack/solid-query";
import { createSignal, For, Show } from "solid-js";

const buttonClass =
	"cursor-pointer rounded-md border border-border bg-card-base px-4 py-2 text-body hover:bg-card-hover disabled:cursor-not-allowed disabled:opacity-50";

const Diagnostics: RouteComponent = () => {
	// ----------------------------------
	// State & Hooks
	const { t } = useTranslation();
	const session = useSession();
	const permissions = usePermissions();
	const client = useQueryClient();
	const [count, setCount] = createSignal(0);
	const state = useQueryState({
		schema: {
			filters: { title: textFilter() },
			sorts: { updatedAt: sort({ defaultValue: "desc" }) },
			pagination: pagination({ defaultPerPage: 5 }),
		},
	});
	const media = useQuery(() => ({
		...queries.media.list({ queryString: state.queryString() }),
		enabled: permissions.can(Permissions.MediaRead),
	}));

	// ----------------------------------
	// Render
	return (
		<section
			class="extension-panel max-w-4xl space-y-6 p-6 extension-wide:p-8"
			data-testid="admin-extension-route"
		>
			<header>
				<h1 class="text-xl font-semibold text-title">
					{t("playground.admin.title")}
				</h1>
				<p class="mt-2 text-body">{t("playground.admin.description")}</p>
			</header>
			<p class="text-body">
				Signed in as {session.user()?.username}. Interface copy uses Lucid’s
				active language.
			</p>
			<button
				type="button"
				class={buttonClass}
				onClick={() => {
					setCount(count() + 1);
					toast({ title: "Playground counter updated", status: "success" });
				}}
			>
				Count: {count()}
			</button>
			<Show
				when={permissions.can(Permissions.MediaRead)}
				fallback={<p class="text-body">Media access is unavailable.</p>}
			>
				<header>
					<h2 class="text-base font-semibold text-title">Shared media query</h2>
					<p class="mt-2 text-body">
						Search and sorting persist in the URL. Refresh invalidates Lucid’s
						shared media cache.
					</p>
				</header>
				<div class="flex flex-wrap items-end gap-3">
					<label class="flex grow flex-col gap-2 text-body">
						Search media
						<input
							type="search"
							class="rounded-md border border-border bg-input-base px-3 py-2 text-input-contrast"
							value={String(state.filters().get("title") ?? "")}
							onInput={(event) =>
								state.setFilter("title", event.currentTarget.value)
							}
						/>
					</label>
					<button
						type="button"
						class={buttonClass}
						onClick={() =>
							state.setSort(
								"updatedAt",
								state.sorts().get("updatedAt") === "desc" ? "asc" : "desc",
							)
						}
					>
						{state.sorts().get("updatedAt") === "desc"
							? "Newest first"
							: "Oldest first"}
					</button>
					<button
						type="button"
						class={buttonClass}
						disabled={media.isFetching}
						onClick={() =>
							client.invalidateQueries({ queryKey: queryKeys.media.all() })
						}
					>
						Refresh
					</button>
				</div>
				<Show when={media.isPending}>
					<p role="status" class="text-body">
						Loading media...
					</p>
				</Show>
				<Show when={media.isError}>
					<p role="alert" class="text-error-base">
						Unable to load media.
					</p>
				</Show>
				<ul class="divide-y divide-border">
					<For each={media.data?.data}>
						{(item) => (
							<li class="py-3 text-body">
								#{item.id} — {item.key}
							</li>
						)}
					</For>
				</ul>
				<Show when={media.isSuccess && media.data.data.length === 0}>
					<p class="text-body">No matching media.</p>
				</Show>
				<nav aria-label="Media pages" class="flex items-center gap-3">
					<button
						type="button"
						class={buttonClass}
						disabled={state.pagination().page <= 1 || media.isFetching}
						onClick={() => state.setPage(state.pagination().page - 1)}
					>
						Previous
					</button>
					<span class="text-body">Page {state.pagination().page}</span>
					<button
						type="button"
						class={buttonClass}
						disabled={
							state.pagination().page >= (media.data?.meta?.lastPage ?? 1) ||
							media.isFetching
						}
						onClick={() => state.setPage(state.pagination().page + 1)}
					>
						Next
					</button>
				</nav>
			</Show>
			<p class="text-seo-good" data-testid="admin-custom-colour">
				This colour comes from the playground’s Tailwind theme.
			</p>
			<p class="text-sm text-subtitle" data-testid="admin-script-status">
				Script: {document.documentElement.dataset.adminExample ?? "missing"}
			</p>
			<div class="flex flex-wrap gap-4">
				<a
					class="text-primary-base underline"
					href="/lucid/collections/page/latest/create"
				>
					Open page editor
				</a>
				<a
					class="text-primary-base underline"
					href="/lucid/e/standalone-playground"
				>
					Standalone route
				</a>
				<a
					class="text-primary-base underline"
					href="/lucid/e/public-playground"
				>
					Public route
				</a>
			</div>
		</section>
	);
};
export default Diagnostics;
