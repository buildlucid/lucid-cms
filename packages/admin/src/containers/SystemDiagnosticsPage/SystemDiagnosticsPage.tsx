import { TbOutlineFileText } from "solid-icons/tb";
import { type Component, createMemo, createSignal, For, Show } from "solid-js";
import Button from "@/components/Button/Button";
import DetailsList from "@/components/DetailsList/DetailsList";
import DiagnosticsReportModal from "@/components/DiagnosticsReportModal/DiagnosticsReportModal";
import InfoRow from "@/components/InfoRow/InfoRow";
import PageLayout from "@/components/PageLayout/PageLayout";
import Pill from "@/components/Pill/Pill";
import ProgressBar from "@/components/ProgressBar/ProgressBar";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import StateNote from "@/components/StateNote/StateNote";
import ToolGroupsReveal from "@/components/ToolGroupsReveal/ToolGroupsReveal";
import { useDiagnostics } from "@/hooks/useDiagnostics/useDiagnostics";
import { usePageTitle } from "@/hooks/usePageTitle/usePageTitle";
import T from "@/translations";
import helpers from "@/utils/helpers";
import { getStorageUsage } from "@/utils/media-storage";
import AiStatusSection from "./parts/AiStatusSection";
import ContentSection from "./parts/ContentSection";
import HealthChecksSection from "./parts/HealthChecksSection";
import InstallSection from "./parts/InstallSection";
import JobsSection from "./parts/JobsSection";
import PluginsSection from "./parts/PluginsSection";
import SignInSection from "./parts/SignInSection";

/** Past this much of the storage limit the usage bar warns. */
const STORAGE_DANGER_PERCENT = 90;

const SystemDiagnosticsPage: Component = () => {
	// ----------------------------------------
	// State & Hooks
	usePageTitle(() => T()("routes.system.diagnostics.title"));

	const state = useDiagnostics();
	const settingsData = state.settings;
	const [reportOpen, setReportOpen] = createSignal(false);

	// ----------------------------------------
	// Memos
	const storageInfo = createMemo(
		() => settingsData.data?.data?.media?.storage ?? null,
	);
	const storageUsage = createMemo(() => getStorageUsage(storageInfo()));
	const clampedRemainingStorage = createMemo(() =>
		Math.max(0, storageInfo()?.remaining ?? 0),
	);
	const storageTitle = createMemo(() => {
		if (storageUsage().unlimited) return T()("media.storage.unlimited.title");
		return T()("media.storage.remaining.title", {
			storage: helpers.bytesToSize(clampedRemainingStorage()),
		});
	});
	const storageBarLabels = createMemo(() => {
		if (storageUsage().unlimited) {
			return {
				start: helpers.bytesToSize(storageInfo()?.used),
				end: T()("common.unlimited"),
			};
		}
		return {
			start: helpers.bytesToSize(storageInfo()?.used),
			end: helpers.bytesToSize(storageInfo()?.total),
		};
	});
	const systemInfo = createMemo(() => settingsData.data?.data?.system);
	const emailInfo = createMemo(() => settingsData.data?.data?.email);
	const mcpInfo = createMemo(() => settingsData.data?.data?.mcp);
	const emailFromValue = createMemo(() => {
		const from = emailInfo()?.from;
		return from ? `${from.name} <${from.email}>` : "-";
	});
	const emailTemplates = createMemo(() => emailInfo()?.templates ?? []);
	const mcpTools = createMemo(() => mcpInfo()?.tools ?? []);
	const agentsInfo = createMemo(() => settingsData.data?.data?.agents);

	// ----------------------------------------
	// Render

	return (
		<PageLayout.Root>
			<PageLayout.Header
				title={T()("routes.system.diagnostics.title")}
				description={T()("routes.system.diagnostics.description")}
				actions={
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={state.report() === undefined}
						onClick={() => setReportOpen(true)}
					>
						<TbOutlineFileText class="mr-2 size-4" />
						{T()("diagnostics.report.open")}
					</Button>
				}
			/>
			<PageLayout.Body>
				<QueryBoundary
					loading={state.loading()}
					error={state.error()}
					onRetry={state.refetch}
					loadingFallback={
						<>
							<InfoRow.Root loading>
								<span class="skeleton block h-28 w-full" />
								<span class="skeleton block h-46 w-full" />
							</InfoRow.Root>
							<InfoRow.Root loading>
								<span class="skeleton block h-32 w-full" />
								<span class="skeleton block h-24 w-full" />
							</InfoRow.Root>
						</>
					}
					class="flex-1 h-full p-4 md:p-6"
				>
					<Show when={state.diagnostics.data?.data}>
						{(diagnostics) => (
							<>
								<InstallSection
									data={diagnostics()}
									clockSkew={state.clockSkew()}
								/>
								<HealthChecksSection state={state} />
								<InfoRow.Root
									title={T()("system.info.title")}
									description={T()("system.info.description")}
								>
									<InfoRow.Content
										title={T()("system.adapters.title")}
										description={T()("system.adapters.description")}
									>
										<DetailsList
											layout="columns"
											variant="plain"
											items={[
												{
													label: T()("common.runtime"),
													value: systemInfo()?.runtime ?? "-",
												},
												{
													label: T()("common.database"),
													value: systemInfo()?.database ?? "-",
												},
												{
													label: T()("common.kv"),
													value: systemInfo()?.kv ?? "-",
												},
												{
													label: T()("common.queue"),
													value: systemInfo()?.queue ?? "-",
												},
												{
													label: T()("common.media"),
													value: systemInfo()?.mediaStorage ?? "-",
												},
												{
													label: T()("common.email"),
													value: systemInfo()?.email ?? "-",
												},
												{
													label: T()("common.media.delivery"),
													value: systemInfo()?.mediaDelivery ?? "-",
												},
												{
													label: T()("common.captcha"),
													value: systemInfo()?.captcha ?? "-",
												},
											]}
										/>
									</InfoRow.Content>
									<InfoRow.Content
										title={T()("diagnostics.database.title")}
										description={T()("diagnostics.database.description")}
									>
										<DetailsList
											layout="columns"
											variant="plain"
											items={[
												{
													label: T()("diagnostics.database.tables"),
													value: diagnostics().database.tables,
												},
												{
													label: T()(
														"diagnostics.database.migrations.executed",
													),
													value: diagnostics().database.migrations.executed,
												},
												{
													label: T()("diagnostics.database.migrations.pending"),
													value: diagnostics().database.migrations.pending,
												},
												{
													label: T()("diagnostics.database.migrations.latest"),
													value:
														diagnostics().database.migrations.latest ?? "-",
												},
											]}
										/>
									</InfoRow.Content>
								</InfoRow.Root>
								<ContentSection data={diagnostics()} />
								<InfoRow.Root
									title={T()("media.info.title")}
									description={T()("media.info.description")}
								>
									<InfoRow.Content title={storageTitle()}>
										<ProgressBar
											value={storageUsage().percent}
											variant={
												storageUsage().percent > STORAGE_DANGER_PERCENT
													? "danger"
													: "primary"
											}
											labels={storageBarLabels()}
										/>
									</InfoRow.Content>
									<InfoRow.Content
										title={T()("media.processed.title")}
										description={T()("media.processed.settings.message", {
											limit:
												settingsData.data?.data?.media?.processed.imageLimit ||
												0,
										})}
									>
										<DetailsList
											layout="columns"
											variant="plain"
											items={[
												{
													label: T()("common.stored"),
													value: settingsData.data?.data?.media?.processed
														.stored
														? T()("common.yes")
														: T()("common.no"),
												},
												{
													label: T()("common.limit"),
													value:
														settingsData.data?.data?.media?.processed
															.imageLimit ?? 0,
												},
												{
													label: T()("common.total"),
													value:
														settingsData.data?.data?.media?.processed.total ??
														0,
												},
											]}
										/>
									</InfoRow.Content>
								</InfoRow.Root>

								<InfoRow.Root
									title={T()("system.email.info.title")}
									description={T()("system.email.info.description")}
								>
									<InfoRow.Content title={T()("system.email.delivery.title")}>
										<DetailsList
											layout="columns"
											variant="plain"
											items={[
												{
													label: T()("common.simulated"),
													value:
														emailInfo()?.simulated === true
															? T()("common.yes")
															: T()("common.no"),
												},
												{
													label: T()("common.from"),
													value: emailFromValue(),
												},
											]}
										/>
									</InfoRow.Content>
									<InfoRow.Content title={T()("common.available.templates")}>
										<Show
											when={emailTemplates().length > 0}
											fallback={
												<p class="text-sm text-muted">
													{T()("empty.states.templates")}
												</p>
											}
										>
											<div class="flex flex-wrap gap-2">
												<For each={emailTemplates()}>
													{(template) => (
														<Pill variant="outline">{template}</Pill>
													)}
												</For>
											</div>
										</Show>
									</InfoRow.Content>
								</InfoRow.Root>
								<SignInSection data={diagnostics()} />
								<AiStatusSection data={diagnostics()} />
								<Show when={mcpInfo()?.enabled}>
									<InfoRow.Root
										title={T()("system.mcp.info.title")}
										description={T()("system.mcp.info.description")}
									>
										<InfoRow.Content
											title={T()("system.mcp.tools.title")}
											description={T()("system.mcp.tools.description")}
										>
											<Show
												when={mcpTools().length > 0}
												fallback={
													<StateNote>{T()("system.mcp.tools.empty")}</StateNote>
												}
											>
												<ToolGroupsReveal
													names={mcpTools().map((tool) => tool.name)}
												/>
											</Show>
										</InfoRow.Content>
									</InfoRow.Root>
								</Show>
								<Show when={agentsInfo()?.enabled}>
									<InfoRow.Root
										title={T()("system.agents.info.title")}
										description={T()("system.agents.info.description")}
									>
										<For
											each={agentsInfo()?.agents}
											fallback={
												<InfoRow.Content>
													<StateNote>{T()("system.agents.empty")}</StateNote>
												</InfoRow.Content>
											}
										>
											{(agent) => (
												<InfoRow.Content
													title={agent.name}
													description={agent.description}
												>
													<DetailsList
														layout="columns"
														variant="plain"
														items={[
															{
																label: T()("common.key"),
																value: agent.key,
															},
															{
																label: T()("system.agents.sidebar"),
																value: agent.sidebar
																	? T()("common.yes")
																	: T()("common.no"),
															},
															{
																label: T()("system.agents.routines"),
																value:
																	agent.routines
																		.map((routine) => routine.name)
																		.join(", ") || "-",
															},
															{
																label: T()("system.agents.tools"),
																show: agent.tools.length > 0,
																value: (
																	<ToolGroupsReveal
																		names={agent.tools.map((tool) => tool.name)}
																	/>
																),
															},
														]}
													/>
												</InfoRow.Content>
											)}
										</For>
									</InfoRow.Root>
								</Show>
								<JobsSection data={diagnostics()} />
								<PluginsSection data={diagnostics()} client={state.client()} />
							</>
						)}
					</Show>
				</QueryBoundary>
				<DiagnosticsReportModal
					open={reportOpen()}
					onOpenChange={setReportOpen}
					report={state.report() ?? ""}
				/>
			</PageLayout.Body>
		</PageLayout.Root>
	);
};

export default SystemDiagnosticsPage;
