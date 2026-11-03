import type {
	DiagnosticPackageStatus,
	DiagnosticPackageUpdate,
	Diagnostics,
} from "@types";
import { type Component, createMemo, Show } from "solid-js";
import DetailsList from "@/components/DetailsList/DetailsList";
import InfoRow from "@/components/InfoRow/InfoRow";
import StatusIndicator, {
	type StatusIndicatorVariant,
} from "@/components/StatusIndicator/StatusIndicator";
import api from "@/services/api";
import T from "@/translations";

const statusVariants = {
	current: "success",
	available: "warning",
	"needs-core": "neutral",
	unknown: "neutral-subtle",
} as const satisfies Record<DiagnosticPackageStatus, StatusIndicatorVariant>;

/** Installed Lucid packages and how each compares with its latest version on npm. */
const PackagesSection: Component<{
	data: Diagnostics;
}> = (props) => {
	// ----------------------------------------
	// Queries & Mutations
	const updates = api.diagnostics.useGetPackageUpdates({
		queryParams: {},
		enabled: () => props.data.install.updateChecks,
	});

	// ----------------------------------------
	// Memos
	const updatesByName = createMemo(
		() =>
			new Map(
				(updates.data?.data ?? []).map((update) => [update.name, update]),
			),
	);

	// ----------------------------------------
	// Render
	return (
		<InfoRow.Root
			title={T()("diagnostics.packages.title")}
			description={T()("diagnostics.packages.description")}
		>
			<InfoRow.Content
				description={T()(
					props.data.install.updateChecks
						? "diagnostics.packages.card.description"
						: "diagnostics.packages.checks.off",
				)}
			>
				{/* one announcement for the section, as each row's skeleton is silent */}
				<Show when={updates.isLoading}>
					<span role="status" class="sr-only">
						{T()("common.loading")}
						{T()("common.ellipsis")}
					</span>
				</Show>
				<DetailsList
					layout="columns"
					variant="plain"
					items={props.data.packages.map((item) => ({
						label: item.name,
						value: (
							<PackageStatus
								version={item.version}
								checked={props.data.install.updateChecks}
								loading={updates.isLoading}
								update={updatesByName().get(item.name)}
							/>
						),
					}))}
				/>
			</InfoRow.Content>
		</InfoRow.Root>
	);
};

/** A package's installed version, then how it compares with the latest once checked. */
const PackageStatus: Component<{
	version: string;
	/** False when update checks are off, which leaves just the version. */
	checked: boolean;
	loading: boolean;
	update: DiagnosticPackageUpdate | undefined;
}> = (props) => {
	// ----------------------------------------
	// Memos
	//* a failed request leaves no update, which reads the same as npm being unreachable
	const status = createMemo(() => props.update?.status ?? "unknown");
	const label = createMemo(() => {
		const update = props.update;
		switch (status()) {
			case "current":
				return T()("diagnostics.packages.current");
			case "available":
				return T()("diagnostics.packages.available", {
					version: update?.latest ?? "",
				});
			case "needs-core":
				return T()("diagnostics.packages.needs.core", {
					version: update?.latest ?? "",
					range: update?.requiresCore ?? "",
				});
			default:
				return T()("diagnostics.packages.unknown");
		}
	});

	// ----------------------------------------
	// Render
	return (
		<span class="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
			<Show when={props.checked}>
				<StatusIndicator
					variant={props.loading ? "neutral-subtle" : statusVariants[status()]}
					size="xs"
				/>
			</Show>
			{props.version}
			<Show when={props.checked}>
				<Show
					when={!props.loading}
					fallback={<span class="skeleton block h-3 w-20" />}
				>
					<span class="text-xs text-muted">{label()}</span>
				</Show>
			</Show>
		</span>
	);
};

export default PackagesSection;
