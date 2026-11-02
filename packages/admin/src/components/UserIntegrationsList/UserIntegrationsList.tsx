import { type Component, createSignal, For } from "solid-js";
import CopyAPIKeyModal from "@/components/CopyAPIKeyModal/CopyAPIKeyModal";
import DeleteIntegrationModal from "@/components/DeleteIntegrationModal/DeleteIntegrationModal";
import IntegrationRow from "@/components/IntegrationRow/IntegrationRow";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import RegenerateAPIKeyModal from "@/components/RegenerateAPIKeyModal/RegenerateAPIKeyModal";
import SkeletonCardRows from "@/components/SkeletonCardRows/SkeletonCardRows";
import StateNote from "@/components/StateNote/StateNote";
import UpsertIntegrationDrawer from "@/components/UpsertIntegrationDrawer/UpsertIntegrationDrawer";
import useRowTarget from "@/hooks/useRowTarget/useRowTarget";
import type { IntegrationServices } from "@/services/api/integrations";
import T from "@/translations";

/** Lists a user's integrations as stacked cards, for drawers and `InfoRow.Item`s. */
export const UserIntegrationsList: Component<{
	services: IntegrationServices;
	canUpdate: boolean;
	canDelete: boolean;
	canRegenerate: boolean;
	/** Opens the create drawer, for a create button outside the list. */
	openCreate?: boolean;
	setOpenCreate?: (open: boolean) => void;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const rowTarget = useRowTarget({
		triggers: {
			delete: false,
			regenerateAPIKey: false,
			update: false,
		},
	});
	const [apiKey, setAPIKey] = createSignal<string>();
	const [copyAPIKeyOpen, setCopyAPIKeyOpen] = createSignal(false);

	// ----------------------------------------
	// Queries
	const integrations = props.services.useGetAll({
		queryParams: {
			perPage: -1,
		},
	});

	// ----------------------------------------
	// Render
	return (
		<>
			<QueryBoundary
				appearance="inline"
				loading={integrations.isLoading}
				loadingFallback={<SkeletonCardRows />}
				error={integrations.isError}
				onRetry={() => integrations.refetch()}
				empty={integrations.isSuccess && integrations.data.data.length === 0}
				emptyFallback={
					<StateNote>{T()("empty.states.integrations")}</StateNote>
				}
			>
				<ul class="flex flex-col gap-3">
					<For each={integrations.data?.data ?? []}>
						{(integration) => (
							<li>
								<IntegrationRow
									integration={integration}
									rowTarget={rowTarget}
									canUpdate={props.canUpdate}
									canDelete={props.canDelete}
									canRegenerate={props.canRegenerate}
								/>
							</li>
						)}
					</For>
				</ul>
			</QueryBoundary>
			<UpsertIntegrationDrawer
				services={props.services}
				state={{
					open: props.openCreate ?? false,
					setOpen: (open) => props.setOpenCreate?.(open),
				}}
				callbacks={{
					onCreateSuccess: (key) => {
						setAPIKey(key);
						setCopyAPIKeyOpen(true);
					},
				}}
			/>
			<UpsertIntegrationDrawer
				id={rowTarget.getTargetId}
				services={props.services}
				state={{
					open: rowTarget.getTriggers().update,
					setOpen: (open) => rowTarget.setTrigger("update", open),
				}}
			/>
			<DeleteIntegrationModal
				id={rowTarget.getTargetId}
				services={props.services}
				state={{
					open: rowTarget.getTriggers().delete,
					setOpen: (open) => rowTarget.setTrigger("delete", open),
				}}
			/>
			<RegenerateAPIKeyModal
				id={rowTarget.getTargetId}
				services={props.services}
				state={{
					open: rowTarget.getTriggers().regenerateAPIKey,
					setOpen: (open) => rowTarget.setTrigger("regenerateAPIKey", open),
				}}
				callbacks={{
					onSuccess: (key) => {
						setAPIKey(key);
						setCopyAPIKeyOpen(true);
					},
				}}
			/>
			<CopyAPIKeyModal
				apiKey={apiKey()}
				state={{
					open: copyAPIKeyOpen(),
					setOpen: (open) => {
						setCopyAPIKeyOpen(open);
						if (!open) setAPIKey(undefined);
					},
				}}
			/>
		</>
	);
};
