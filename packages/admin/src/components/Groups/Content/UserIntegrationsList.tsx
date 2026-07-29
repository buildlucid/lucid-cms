import { type Component, createSignal, For, Show } from "solid-js";
import InfoRow from "@/components/Blocks/InfoRow";
import { DynamicContent } from "@/components/Groups/Layout";
import CopyAPIKey from "@/components/Modals/Integrations/CopyAPIKey";
import DeleteIntegration from "@/components/Modals/Integrations/DeleteIntegration";
import RegenerateAPIKey from "@/components/Modals/Integrations/RegenerateAPIKey";
import UpsertIntegrationPanel from "@/components/Panels/Integrations/UpsertIntegrationPanel";
import Button from "@/components/Partials/Button";
import IntegrationRow from "@/components/Partials/IntegrationRow";
import useRowTarget from "@/hooks/useRowTarget";
import type { IntegrationServices } from "@/services/api/integrations";
import T from "@/translations";

export const UserIntegrationsList: Component<{
	services: IntegrationServices;
	canCreate: boolean;
	canUpdate: boolean;
	canDelete: boolean;
	canRegenerate: boolean;
	embedded?: boolean;
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
	const [internalCreateOpen, setInternalCreateOpen] = createSignal(false);
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
	// Functions
	const createOpen = () => props.openCreate ?? internalCreateOpen();
	const setCreateOpen = (open: boolean) => {
		props.setOpenCreate?.(open);
		if (props.setOpenCreate === undefined) setInternalCreateOpen(open);
	};

	const content = () => (
		<>
			<DynamicContent
				state={{
					isLoading: integrations.isLoading,
					isError: integrations.isError,
					isSuccess: integrations.isSuccess,
					isEmpty:
						integrations.isSuccess && integrations.data.data.length === 0,
				}}
				copy={{
					noEntries: {
						title: T()("empty.states.integrations.title"),
						description: T()("empty.states.user.integrations.description"),
						button: T()("integrations.create.action"),
					},
				}}
				callback={
					props.canCreate
						? {
								createEntry: () => setCreateOpen(true),
							}
						: undefined
				}
				permissions={{
					create: props.canCreate,
				}}
				options={{
					inline: true,
					contained: true,
					noEntriesButtonTheme: "border-outline",
				}}
			>
				<div class="flex flex-col">
					<For each={integrations.data?.data ?? []}>
						{(integration) => (
							<IntegrationRow
								integration={integration}
								rowTarget={rowTarget}
								canUpdate={props.canUpdate}
								canDelete={props.canDelete}
								canRegenerate={props.canRegenerate}
							/>
						)}
					</For>
				</div>
			</DynamicContent>
			<Show
				when={
					!props.embedded &&
					props.canCreate &&
					integrations.isSuccess &&
					integrations.data.data.length > 0
				}
			>
				<div class="mt-3 flex justify-end">
					<Button
						type="button"
						size="small"
						theme="border-outline"
						onClick={() => setCreateOpen(true)}
					>
						{T()("integrations.create.action")}
					</Button>
				</div>
			</Show>
		</>
	);

	// ----------------------------------------
	// Render
	return (
		<>
			<Show
				when={props.embedded}
				fallback={
					<InfoRow.Root
						title={T()("user.integrations.manage.title")}
						description={T()("user.integrations.manage.description")}
					>
						{content()}
					</InfoRow.Root>
				}
			>
				{content()}
			</Show>
			<UpsertIntegrationPanel
				services={props.services}
				state={{
					open: createOpen(),
					setOpen: setCreateOpen,
				}}
				callbacks={{
					onCreateSuccess: (key) => {
						setAPIKey(key);
						setCopyAPIKeyOpen(true);
					},
				}}
			/>
			<UpsertIntegrationPanel
				id={rowTarget.getTargetId}
				services={props.services}
				state={{
					open: rowTarget.getTriggers().update,
					setOpen: (open) => rowTarget.setTrigger("update", open),
				}}
			/>
			<DeleteIntegration
				id={rowTarget.getTargetId}
				services={props.services}
				state={{
					open: rowTarget.getTriggers().delete,
					setOpen: (open) => rowTarget.setTrigger("delete", open),
				}}
			/>
			<RegenerateAPIKey
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
			<CopyAPIKey
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
