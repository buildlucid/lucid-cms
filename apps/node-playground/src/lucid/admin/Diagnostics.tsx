import {
	Alert,
	Button,
	Copy,
	EmptyState,
	InfoRow,
	Link,
	PageLayout,
	Pagination,
	Pill,
	QueryBoundary,
	QueryToolbar,
	Table,
} from "@lucidcms/admin/components";
import {
	Permissions,
	pagination,
	sort,
	textFilter,
	usePermissions,
	useQueryState,
	useSession,
	useTranslation,
} from "@lucidcms/admin/hooks";
import { queries, queryKeys } from "@lucidcms/admin/services";
import type { RouteComponent } from "@lucidcms/admin/types";
import { copyValue, toast } from "@lucidcms/admin/utils";
import { useQuery, useQueryClient } from "@tanstack/solid-query";
import { createSignal, Index, Show } from "solid-js";

/** A starting point for custom admin routes, built only from Lucid's admin exports. */
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

	// ----------------------------------
	// Queries
	const media = useQuery(() => ({
		...queries.media.list({ queryString: state.queryString() }),
		enabled: permissions.can(Permissions.MediaRead),
	}));

	// ----------------------------------
	// Render
	return (
		<PageLayout.Root>
			<PageLayout.Header
				title={t("playground.admin.title")}
				description={t("playground.admin.description")}
				actions={
					<Button
						size="sm"
						onClick={() => {
							setCount(count() + 1);
							toast({ title: "Playground counter updated", status: "success" });
						}}
					>
						Count: {count()}
					</Button>
				}
			/>
			<PageLayout.Body padding="md">
				<div data-testid="admin-extension-route">
					<InfoRow.Root
						title="Session"
						description="Hooks for the signed-in user, permissions and startup scripts."
					>
						<InfoRow.Content
							title={`Signed in as ${session.user()?.username ?? "unknown"}`}
							description="Interface copy uses Lucid’s active language."
							actions={
								<Pill
									variant={
										permissions.can(Permissions.MediaRead)
											? "primary-subtle"
											: "warning-subtle"
									}
								>
									{permissions.can(Permissions.MediaRead)
										? "Media access"
										: "No media access"}
								</Pill>
							}
						>
							<div class="space-y-3">
								<Show when={session.user()?.email}>
									{(email) => <Copy.Button value={email()} />}
								</Show>
								<p class="text-sm" data-testid="admin-script-status">
									Script:{" "}
									{document.documentElement.dataset.adminExample ?? "missing"}
								</p>
							</div>
						</InfoRow.Content>
					</InfoRow.Root>

					<InfoRow.Root
						title="Shared media query"
						description="Search and sorting persist in the URL. Refresh invalidates Lucid’s shared media cache."
					>
						<Show
							when={permissions.can(Permissions.MediaRead)}
							fallback={
								<Alert variant="warning">Media access is unavailable.</Alert>
							}
						>
							<InfoRow.Content>
								<div class="-mx-4 overflow-hidden">
									<QueryToolbar
										queryState={state}
										filterSubject="Media"
										filterFields={[
											{ key: "title", label: "Title", type: "text" },
										]}
										sorts={[{ key: "updatedAt", label: "Updated at" }]}
										perPage={[5, 10, 20]}
										onRefresh={() =>
											client.invalidateQueries({
												queryKey: queryKeys.media.all(),
											})
										}
										padding="sm"
									/>
									<QueryBoundary
										error={media.isError}
										empty={media.data?.data.length === 0}
										queryState={state}
										emptyFallback={
											<EmptyState
												title="No media yet"
												description="Upload something in the media library to see it here."
											/>
										}
										// Pagination hides when empty, so let the empty/error state fill the card's padding
										class={
											media.isError || media.data?.data.length === 0
												? "-mb-4 border-t border-border"
												: "border-t border-border"
										}
									>
										<Table.Root
											id="playground.media"
											rowCount={media.data?.data.length ?? 0}
											loading={media.isFetching}
											loadingRows={5}
											queryState={state}
											columns={[
												{ key: "id", label: "ID" },
												{ key: "key", label: "Key" },
												{ key: "type", label: "Type" },
												{
													key: "updatedAt",
													label: "Updated at",
													sortable: true,
												},
											]}
											padding="sm"
											variant="contained"
										>
											<Index each={media.data?.data}>
												{(item, index) => (
													<Table.Row
														index={index}
														actions={[
															{
																type: "button",
																label: "Copy key",
																icon: "copy",
																onClick: () => copyValue(item().key),
															},
														]}
													>
														<Table.Text column="id" text={item().id} />
														<Table.Text column="key" text={item().key} />
														<Table.Pill column="type" text={item().type} />
														<Table.Date
															column="updatedAt"
															date={item().updatedAt}
														/>
													</Table.Row>
												)}
											</Index>
										</Table.Root>
									</QueryBoundary>
									<Pagination
										queryState={state}
										meta={media.data?.meta}
										variant="inline"
										padding="sm"
										hideWhenEmpty
									/>
								</div>
							</InfoRow.Content>
						</Show>
					</InfoRow.Root>

					<InfoRow.Root
						title="Other routes"
						description="Quick links for checking the editor and routes without the admin shell."
					>
						<InfoRow.Content>
							<div class="flex flex-wrap gap-2">
								<Link
									href="/lucid/collections/page/latest/create"
									variant="outline"
									size="sm"
								>
									Open page editor
								</Link>
								<Link
									href="/lucid/e/standalone-playground"
									variant="outline"
									size="sm"
								>
									Standalone route
								</Link>
								<Link
									href="/lucid/e/public-playground"
									variant="outline"
									size="sm"
								>
									Public route
								</Link>
							</div>
						</InfoRow.Content>
					</InfoRow.Root>
				</div>
			</PageLayout.Body>
		</PageLayout.Root>
	);
};
export default Diagnostics;
