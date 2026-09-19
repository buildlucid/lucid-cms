import { type Component, createSignal, For, Show } from "solid-js";
import Button from "@/components/Button/Button";
import CopyAPIKeyModal from "@/components/CopyAPIKeyModal/CopyAPIKeyModal";
import DeleteIntegrationModal from "@/components/DeleteIntegrationModal/DeleteIntegrationModal";
import { DynamicContent } from "@/components/DynamicContent/DynamicContent";
import InfoRow from "@/components/InfoRow/InfoRow";
import IntegrationRow from "@/components/IntegrationRow/IntegrationRow";
import RegenerateAPIKeyModal from "@/components/RegenerateAPIKeyModal/RegenerateAPIKeyModal";
import UpsertIntegrationDrawer from "@/components/UpsertIntegrationDrawer/UpsertIntegrationDrawer";
import useRowTarget from "@/hooks/useRowTarget/useRowTarget";
import type { IntegrationServices } from "@/services/api/integrations";
import T from "@/translations";

export const UserIntegrationsList: Component<{
	services: IntegrationServices;
	canCreate: boolean;
	canUpdate: boolean;
	canDelete: boolean;
	canRegenerate: boolean;
	embedded?: boolean;
	contained?: boolean;
	contentRow?: {
		title: string;
		description?: string;
	};
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
									description: T()(
										"empty.states.user.integrations.description",
									),
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
							options={{
								inline: true,
								contained: props.contained !== false,
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
								props.canCreate &&
								integrations.isSuccess &&
								integrations.data.data.length > 0
							}
						>
							<div class="mt-3 flex justify-start">
								<Button
									type="button"
									size="sm"
									variant="primary"
									onClick={() => setCreateOpen(true)}
								>
									{T()("integrations.create.action")}
								</Button>
							</div>
						</Show>
					</InfoRow.Root>
				}
			>
				<Show
					when={props.contentRow}
					fallback={
						<>
							<DynamicContent
								state={{
									isLoading: integrations.isLoading,
									isError: integrations.isError,
									isSuccess: integrations.isSuccess,
									isEmpty:
										integrations.isSuccess &&
										integrations.data.data.length === 0,
								}}
								copy={{
									noEntries: {
										title: T()("empty.states.integrations.title"),
										description: T()(
											"empty.states.user.integrations.description",
										),
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
								options={{
									inline: true,
									contained: props.contained !== false,
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
									props.canCreate &&
									integrations.isSuccess &&
									integrations.data.data.length > 0
								}
							>
								<div class="mt-3 flex justify-start">
									<Button
										type="button"
										size="sm"
										variant="primary"
										onClick={() => setCreateOpen(true)}
									>
										{T()("integrations.create.action")}
									</Button>
								</div>
							</Show>
						</>
					}
				>
					{(contentRow) => (
						<>
							<InfoRow.Content
								title={contentRow().title}
								description={contentRow().description}
							>
								<div class="-mx-4 -mb-4 overflow-hidden border-t border-border">
									<DynamicContent
										state={{
											isLoading: integrations.isLoading,
											isError: integrations.isError,
											isSuccess: integrations.isSuccess,
											isEmpty:
												integrations.isSuccess &&
												integrations.data.data.length === 0,
										}}
										copy={{
											noEntries: {
												title: T()("empty.states.integrations.title"),
												description: T()(
													"empty.states.user.integrations.description",
												),
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
										options={{
											inline: true,
											contained: props.contained !== false,
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
								</div>
							</InfoRow.Content>
							<Show
								when={
									props.canCreate &&
									integrations.isSuccess &&
									integrations.data.data.length > 0
								}
							>
								<div class="-mt-1 flex justify-start">
									<Button
										type="button"
										size="sm"
										variant="primary"
										onClick={() => setCreateOpen(true)}
									>
										{T()("integrations.create.action")}
									</Button>
								</div>
							</Show>
						</>
					)}
				</Show>
			</Show>
			<UpsertIntegrationDrawer
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
