import type { DiagnosticCheckKey, DiagnosticCheckResult } from "@types";
import { TbOutlineRefresh, TbOutlineSend } from "solid-icons/tb";
import { type Component, For, Match, Show, Switch } from "solid-js";
import Button from "@/components/Button/Button";
import DetailsList from "@/components/DetailsList/DetailsList";
import InfoRow from "@/components/InfoRow/InfoRow";
import StatusIndicator from "@/components/StatusIndicator/StatusIndicator";
import type { DiagnosticsState } from "@/hooks/useDiagnostics/useDiagnostics";
import T from "@/translations";

/** Checks the "Run Checks" button covers. Email sends a real email, so it has its own button. */
const SERVICE_CHECKS: DiagnosticCheckKey[] = ["database", "kv", "mediaStorage"];

/** Runs the adapter checks and shows each one's outcome. */
const HealthChecksSection: Component<{
	state: DiagnosticsState;
}> = (props) => {
	// ----------------------------------------
	// Functions
	//* each row ends with a small icon button that runs just that check
	const row = (key: DiagnosticCheckKey) => {
		const label =
			key === "email"
				? T()("diagnostics.checks.email.send")
				: T()("diagnostics.checks.run.single");
		return (
			<span class="flex w-full items-start justify-between gap-3">
				<CheckStatus
					result={props.state.checks.result(key)}
					running={props.state.checks.running(key)}
				/>
				<Button
					type="button"
					variant="ghost"
					size="xs"
					shape="square"
					class="-my-1"
					title={label}
					aria-label={label}
					loading={props.state.checks.running(key)}
					onClick={() => props.state.checks.run([key])}
				>
					<Show
						when={key === "email"}
						fallback={<TbOutlineRefresh class="size-3.5" />}
					>
						<TbOutlineSend class="size-3.5" />
					</Show>
				</Button>
			</span>
		);
	};

	// ----------------------------------------
	// Render
	return (
		<InfoRow.Root
			title={T()("diagnostics.checks.title")}
			description={T()("diagnostics.checks.description")}
		>
			<InfoRow.Content
				title={T()("diagnostics.checks.card.title")}
				description={T()("diagnostics.checks.card.description")}
				actions={
					<Button
						type="button"
						variant="outline"
						size="sm"
						loading={SERVICE_CHECKS.some((key) =>
							props.state.checks.running(key),
						)}
						onClick={() => props.state.checks.run(SERVICE_CHECKS)}
					>
						{T()("diagnostics.checks.run")}
					</Button>
				}
			>
				<DetailsList
					layout="columns"
					variant="plain"
					items={[
						{ label: T()("common.database"), value: row("database") },
						{ label: T()("common.kv"), value: row("kv") },
						{
							label: T()("diagnostics.checks.media.storage"),
							value: row("mediaStorage"),
						},
						{ label: T()("common.email"), value: row("email") },
					]}
				/>
			</InfoRow.Content>
		</InfoRow.Root>
	);
};

/** One check's outcome: not run, checking, passed, skipped or failed with its errors. */
const CheckStatus: Component<{
	result: DiagnosticCheckResult | undefined;
	running: boolean;
}> = (props) => {
	// ----------------------------------------
	// Functions
	const errors = () =>
		[
			props.result?.message,
			...(props.result?.steps
				.filter((step) => step.error !== null)
				.map((step) => `${step.name}: ${step.error}`) ?? []),
		].filter((error): error is string => Boolean(error));

	// ----------------------------------------
	// Render
	return (
		<span class="flex min-w-0 flex-col gap-1">
			<span class="inline-flex items-center gap-2">
				<Switch
					fallback={
						<>
							<StatusIndicator variant="neutral-subtle" size="xs" />
							{T()("diagnostics.checks.not.run")}
						</>
					}
				>
					<Match when={props.running}>
						<StatusIndicator variant="neutral" size="xs" />
						{T()("diagnostics.checks.running")}
					</Match>
					<Match when={props.result?.status === "passed"}>
						<StatusIndicator variant="success" size="xs" />
						{T()("diagnostics.checks.passed", {
							duration: props.result?.duration ?? 0,
						})}
					</Match>
					<Match when={props.result?.status === "skipped"}>
						<StatusIndicator variant="neutral" size="xs" />
						{T()("diagnostics.checks.skipped")}
					</Match>
					<Match when={props.result?.status === "failed"}>
						<StatusIndicator variant="danger" size="xs" />
						{T()("diagnostics.checks.failed")}
					</Match>
				</Switch>
				<Show when={props.result?.adapter}>
					{(adapter) => <span class="text-xs text-muted">{adapter()}</span>}
				</Show>
			</span>
			<Show when={!props.running && errors().length > 0}>
				<For each={errors()}>
					{(error) => (
						<span
							class={
								props.result?.status === "failed"
									? "text-xs font-normal text-danger wrap-anywhere"
									: "text-xs font-normal text-muted"
							}
						>
							{error}
						</span>
					)}
				</For>
			</Show>
		</span>
	);
};

export default HealthChecksSection;
