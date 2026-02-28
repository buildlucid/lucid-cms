import type { ClientScope } from "@types";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
} from "solid-js";
import InputGrid from "@/components/Containers/InputGrid";
import { Checkbox, Input, Switch, Textarea } from "@/components/Groups/Form";
import { Panel } from "@/components/Groups/Panel";
import api from "@/services/api";
import T, { type TranslationKeys } from "@/translations";
import { clientScopeKeyToTranslation } from "@/translations/helpers";
import { getBodyError } from "@/utils/error-helpers";
import helpers from "@/utils/helpers";

interface UpsertClientIntegrationPanelProps {
	id?: Accessor<number | undefined>;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
	callbacks?: {
		onCreateSuccess?: (key: string) => void;
	};
}

const UpsertClientIntegrationPanel: Component<
	UpsertClientIntegrationPanelProps
> = (props) => {
	// ---------------------------------
	// State
	const [getName, setName] = createSignal("");
	const [getDescription, setDescription] = createSignal("");
	const [getEnabled, setEnabled] = createSignal<boolean>(true);
	const [getScopes, setScopes] = createSignal<ClientScope[]>([]);

	// ---------------------------------
	// Memos
	const mode = createMemo(() => {
		if (props.id === undefined || props.id() === undefined) return "create";
		return "update";
	});

	// ---------------------------------
	// Query
	const clientIntegration = api.clientIntegrations.useGetSingle({
		queryParams: {
			location: {
				id: props.id as Accessor<number | undefined>,
			},
		},
		key: () => props.state.open,
		enabled: () => props.state.open && mode() !== "create",
	});
	const availableScopes = api.clientIntegrations.useGetScopes({
		queryParams: {},
		enabled: () => props.state.open,
	});

	// ----------------------------------------
	// Mutations
	const createClientIntegration = api.clientIntegrations.useCreateSingle({
		onSuccess: (data) => {
			props.state.setOpen(false);
			props.callbacks?.onCreateSuccess?.(data.data.apiKey);
		},
	});
	const updateClientIntegration = api.clientIntegrations.useUpdateSingle({
		onSuccess: () => {
			props.state.setOpen(false);
		},
	});

	// ---------------------------------
	// Effects
	createEffect(() => {
		if (clientIntegration.isSuccess) {
			setName(clientIntegration.data?.data.name || "");
			setDescription(clientIntegration.data?.data.description || "");
			setEnabled(clientIntegration.data?.data.enabled || false);
			setScopes(clientIntegration.data?.data.scopes || []);
		}
	});

	// ---------------------------------
	// Memos
	const isLoading = createMemo(() => {
		if (mode() === "create") return availableScopes.isLoading;
		return clientIntegration.isLoading || availableScopes.isLoading;
	});
	const isError = createMemo(() => {
		if (mode() === "create") return availableScopes.isError;
		return clientIntegration.isError || availableScopes.isError;
	});

	const panelTitle = createMemo(() => {
		if (mode() === "create")
			return T()("create_client_integration_panel_title");
		return T()("update_client_integration_panel_title");
	});
	const panelSubmit = createMemo(() => {
		if (mode() === "create") return T()("create");
		return T()("update");
	});

	const updateData = createMemo(() => {
		return helpers.updateData(
			{
				name: clientIntegration.data?.data.name,
				description: clientIntegration.data?.data.description,
				enabled: clientIntegration.data?.data.enabled,
				scopes: clientIntegration.data?.data.scopes || [],
			},
			{
				name: getName(),
				description: getDescription(),
				enabled: getEnabled(),
				scopes: getScopes(),
			},
		);
	});
	const submitIsDisabled = createMemo(() => {
		if (mode() === "create" && getScopes().length === 0) return true;
		if (mode() === "create") return false;
		return !updateData().changed;
	});
	const isCreating = createMemo(() => {
		return (
			createClientIntegration.action.isPending ||
			updateClientIntegration.action.isPending
		);
	});
	const errors = createMemo(() => {
		if (mode() === "create") return createClientIntegration.errors();
		return updateClientIntegration.errors();
	});

	// ---------------------------------
	// Return
	return (
		<Panel
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
			}}
			fetchState={{
				isLoading: isLoading(),
				isError: isError(),
			}}
			mutateState={{
				isLoading: isCreating(),
				isDisabled: submitIsDisabled(),
				errors: errors(),
			}}
			callbacks={{
				onSubmit: () => {
					if (mode() === "create") {
						createClientIntegration.action.mutate({
							name: getName(),
							description: getDescription(),
							enabled: getEnabled(),
							scopes: getScopes(),
						});
					} else {
						updateClientIntegration.action.mutate({
							id: props.id?.() as number,
							body: updateData().data,
						});
					}
				},
				reset: () => {
					setName("");
					setDescription("");
					setEnabled(true);
					setScopes([]);
					createClientIntegration.reset();
					updateClientIntegration.reset();
				},
			}}
			copy={{
				title: panelTitle(),
				submit: panelSubmit(),
			}}
			options={{
				padding: "24",
			}}
		>
			{() => (
				<>
					<InputGrid columns={2}>
						<Input
							id="name"
							name="name"
							type="text"
							value={getName()}
							onChange={setName}
							copy={{
								label: T()("name"),
							}}
							required={true}
							errors={getBodyError("name", errors)}
							noMargin={true}
						/>
					</InputGrid>
					<Textarea
						id="description"
						name="description"
						value={getDescription()}
						onChange={setDescription}
						copy={{
							label: T()("description"),
						}}
						rows={3}
						errors={getBodyError("description", errors)}
					/>
					<Switch
						id="enabled"
						name="enabled"
						value={getEnabled()}
						onChange={(value) => setEnabled(value)}
						copy={{
							label: T()("enabled"),
						}}
						errors={getBodyError("enabled", errors)}
						hideOptionalText={true}
					/>
					<div class="w-full mb-5 last:mb-0">
						<div class="w-full">
							<For each={availableScopes.data?.data}>
								{(group) => (
									<div class="mb-4 last:mb-0">
										<div class="flex justify-between">
											<h4 class="text-sm font-medium text-body">
												{T()(group.key as TranslationKeys)}
											</h4>
										</div>
										<div class="mt-1.5 border border-border p-3 rounded-md grid grid-cols-2 gap-x-4 gap-y-2 bg-card-base">
											<For each={group.scopes}>
												{(scope) => (
													<Checkbox
														value={getScopes().includes(scope)}
														onChange={() =>
															setScopes((prev) => {
																if (prev.includes(scope))
																	return prev.filter((s) => s !== scope);
																return [...prev, scope];
															})
														}
														copy={{
															label: T()(clientScopeKeyToTranslation(scope)),
														}}
														noMargin={true}
													/>
												)}
											</For>
										</div>
									</div>
								)}
							</For>
						</div>
					</div>
				</>
			)}
		</Panel>
	);
};

export default UpsertClientIntegrationPanel;
