import {
	EmptyState,
	FilterPanel,
	FilterToggle,
	Modal,
	Pagination,
	PerPageSelect,
	QueryBoundary,
	Table,
} from "@lucidcms/admin/components";
import {
	pagination,
	textFilter,
	useQueryState,
	useTranslation,
} from "@lucidcms/admin/hooks";
import {
	TbOutlineLanguage,
	TbOutlineLink,
	TbOutlineWorld,
} from "solid-icons/tb";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Index,
	on,
	Show,
} from "solid-js";
import type { PreviousPath } from "../../../../schema/previous-paths.js";
import usePreviousPaths from "../../../hooks/use-previous-paths.js";
import type {} from "../../../translations.js";
import filterPreviousPaths from "../../../utils/filter-previous-paths.js";

/**
 * The drawer's toolbar, filters, table and pagination. Filters and pages apply to the paths the
 * page has, which are few, so they run here rather than on the server.
 */
const PreviousPathsContent: Component<{ onClose: () => void }> = (props) => {
	// ----------------------------------
	// State & Hooks
	const { t } = useTranslation();
	const previous = usePreviousPaths();
	const queryState = useQueryState({
		mode: "memory",
		schema: {
			filters: { locale: textFilter(), environment: textFilter() },
			pagination: pagination({ defaultPerPage: 10 }),
		},
	});
	const [filtersOpen, setFiltersOpen] = createSignal(false);
	const [removing, setRemoving] = createSignal<PreviousPath>();

	// ----------------------------------
	// Memos
	const paths = createMemo(() => previous.paths.data ?? []);
	const locales = createMemo(() => [
		...new Set(paths().flatMap((path) => (path.locale ? [path.locale] : []))),
	]);
	const filterFields = createMemo(() => [
		...(locales().length > 0
			? [
					{
						key: "locale",
						label: t("plugin.pages.previous.paths.locale"),
						type: "select" as const,
						operators: ["=" as const, "!=" as const],
						options: locales().map((locale) => ({
							value: locale,
							label: locale.toUpperCase(),
						})),
					},
				]
			: []),
		...(previous.showEnvironment()
			? [
					{
						key: "environment",
						label: t("common.environment"),
						type: "select" as const,
						operators: ["=" as const, "!=" as const],
						options: previous.environments().map((environment) => ({
							value: environment.key,
							label: environment.label,
						})),
					},
				]
			: []),
	]);
	const filtered = createMemo(() =>
		filterPreviousPaths(
			paths(),
			queryState.filterStates(),
			queryState.orFilterGroups(),
		),
	);
	const page = createMemo(() => {
		const { page, perPage } = queryState.pagination();
		const lastPage = Math.max(1, Math.ceil(filtered().length / perPage));
		const currentPage = Math.min(page, lastPage);
		return {
			rows: filtered().slice(
				(currentPage - 1) * perPage,
				currentPage * perPage,
			),
			meta: {
				links: [],
				path: "",
				currentPage,
				lastPage,
				perPage,
				total: filtered().length,
			},
		};
	});
	const columns = createMemo(() => [
		{
			key: "path",
			label: t("plugin.pages.fields.path.label"),
			icon: <TbOutlineLink />,
		},
		...(locales().length > 0
			? [
					{
						key: "locale",
						label: t("plugin.pages.previous.paths.locale"),
						icon: <TbOutlineLanguage />,
					},
				]
			: []),
		...(previous.showEnvironment()
			? [
					{
						key: "environment",
						label: t("common.environment"),
						icon: <TbOutlineWorld />,
					},
				]
			: []),
	]);

	// ----------------------------------
	// Effects
	//* nothing is left to show once the page's last path goes, however it went. `before` is undefined on the first run
	createEffect(
		on(paths, (current, before) => {
			if (before !== undefined && before.length > 0 && current.length === 0) {
				props.onClose();
			}
		}),
	);

	// ----------------------------------
	// Render
	return (
		<div class="flex h-full flex-col">
			<div class="mb-4 flex flex-wrap items-center justify-between gap-2.5">
				<Show when={filterFields().length > 0}>
					<FilterToggle
						open={filtersOpen()}
						onOpenChange={setFiltersOpen}
						queryState={queryState}
					/>
				</Show>
				<PerPageSelect
					class="ms-auto"
					options={[5, 10, 20]}
					queryState={queryState}
				/>
			</div>
			<FilterPanel
				open={filtersOpen()}
				onOpenChange={setFiltersOpen}
				subject={t("plugin.pages.previous.paths.title")}
				fields={filterFields()}
				queryState={queryState}
				embedded={true}
			/>
			<QueryBoundary
				error={previous.paths.isError && previous.paths.data === undefined}
				empty={!previous.paths.isLoading && page().rows.length === 0}
				queryState={queryState}
				onRetry={() => void previous.paths.refetch()}
				emptyFallback={
					<EmptyState
						title={t("plugin.pages.previous.paths.empty.title")}
						description={t("plugin.pages.previous.paths.empty.description")}
					/>
				}
				class="h-full flex-1 rounded-md border border-border bg-card"
			>
				<Table.Root
					id="pages.previousPaths"
					rowCount={page().rows.length}
					queryState={queryState}
					columns={columns()}
					loading={previous.paths.isFetching}
					padding="sm"
					variant="secondary"
				>
					<Index each={page().rows}>
						{(path, index) => (
							<Table.Row
								index={index}
								actions={[
									{
										label: t("common.remove"),
										type: "button",
										icon: "trash",
										variant: "danger",
										permission: previous.canRemove(),
										excludeFromRowClick: true,
										onClick: () => setRemoving(path()),
									},
								]}
							>
								<Table.Text column="path" text={path().path} />
								<Show when={locales().length > 0}>
									<Table.Text
										column="locale"
										text={path().locale?.toUpperCase() ?? "-"}
									/>
								</Show>
								<Show when={previous.showEnvironment()}>
									<Table.Text
										column="environment"
										text={previous.environmentLabel(path().environment)}
									/>
								</Show>
							</Table.Row>
						)}
					</Index>
				</Table.Root>
			</QueryBoundary>
			<Pagination queryState={queryState} meta={page().meta} variant="inline" />
			<Modal.Confirm
				open={removing() !== undefined}
				onOpenChange={(open) => {
					if (!open) setRemoving(undefined);
				}}
				title={t("plugin.pages.previous.paths.remove.title")}
				description={t("plugin.pages.previous.paths.remove.description", {
					path: removing()?.path ?? "",
				})}
				confirmLabel={t("common.remove")}
				confirmVariant="danger"
				loading={previous.remove.isPending}
				error={previous.remove.error?.message}
				onConfirm={() => {
					const path = removing();
					if (path) {
						previous.remove.mutate(path, {
							onSuccess: () => setRemoving(undefined),
						});
					}
				}}
				onCancel={() => {
					setRemoving(undefined);
					previous.remove.reset();
				}}
			/>
		</div>
	);
};

export default PreviousPathsContent;
