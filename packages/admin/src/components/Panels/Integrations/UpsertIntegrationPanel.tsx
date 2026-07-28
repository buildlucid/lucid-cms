import type {
	ExternalScope,
	ExternalScopeGroup,
	IntegrationExpiry,
} from "@types";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
} from "solid-js";
import InputGrid from "@/components/Containers/InputGrid";
import {
	CheckboxButton,
	Input,
	Select,
	Switch,
	Textarea,
} from "@/components/Groups/Form";
import { Panel } from "@/components/Groups/Panel";
import type { IntegrationServices } from "@/services/api/integrations";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";
import helpers from "@/utils/helpers";

interface UpsertIntegrationPanelProps {
	id?: Accessor<number | undefined>;
	services: IntegrationServices;
	state: {
		open: boolean;
		setOpen: (_state: boolean) => void;
	};
	callbacks?: {
		onCreateSuccess?: (key: string) => void;
	};
}

const UpsertIntegrationPanel: Component<UpsertIntegrationPanelProps> = (
	props,
) => {
	// ----------------------------------------
	// State & Hooks
	const [getName, setName] = createSignal("");
	const [getDescription, setDescription] = createSignal("");
	const [getEnabled, setEnabled] = createSignal<boolean>(true);
	const [getExpiry, setExpiry] = createSignal<IntegrationExpiry | undefined>(
		"never",
	);
	const [getScopes, setScopes] = createSignal<ExternalScope[]>([]);

	// ----------------------------------------
	// Memos
	const mode = createMemo(() => {
		if (props.id === undefined || props.id() === undefined) return "create";
		return "update";
	});

	// ----------------------------------------
	// Queries
	const integration = props.services.useGetSingle({
		queryParams: {
			location: {
				id: props.id as Accessor<number | undefined>,
			},
		},
		key: () => props.state.open,
		enabled: () => props.state.open && mode() !== "create",
	});
	const availableScopes = props.services.useGetScopes({
		queryParams: {},
		enabled: () => props.state.open,
	});

	// ----------------------------------------
	// Mutations
	const createIntegration = props.services.useCreateSingle({
		onSuccess: (data) => {
			props.state.setOpen(false);
			props.callbacks?.onCreateSuccess?.(data.data.apiKey);
		},
	});
	const updateIntegration = props.services.useUpdateSingle({
		onSuccess: () => {
			props.state.setOpen(false);
		},
	});

	// ----------------------------------------
	// Memos
	const isLoading = createMemo(() => {
		if (mode() === "create") return availableScopes.isLoading;
		return integration.isLoading || availableScopes.isLoading;
	});
	const isError = createMemo(() => {
		if (mode() === "create") return availableScopes.isError;
		return integration.isError || availableScopes.isError;
	});

	const panelTitle = createMemo(() => {
		if (mode() === "create") return T()("panels.integrations.create.title");
		return T()("panels.integrations.update.title");
	});
	const panelSubmit = createMemo(() => {
		if (mode() === "create") return T()("common.create");
		return T()("common.update");
	});

	const updateData = createMemo(() => {
		const data = helpers.updateData(
			{
				name: integration.data?.data.name,
				description: integration.data?.data.description,
				enabled: integration.data?.data.enabled,
				scopes: integration.data?.data.scopes || [],
			},
			{
				name: getName(),
				description: getDescription(),
				enabled: getEnabled(),
				scopes: getScopes(),
			},
		);
		const expiry = getExpiry();
		return {
			changed: data.changed || expiry !== undefined,
			data: {
				...data.data,
				...(expiry === undefined ? {} : { expiry }),
			},
		};
	});
	const submitIsDisabled = createMemo(() => {
		if (mode() === "create") return false;
		return !updateData().changed;
	});
	const isCreating = createMemo(() => {
		return (
			createIntegration.action.isPending || updateIntegration.action.isPending
		);
	});
	const errors = createMemo(() => {
		if (mode() === "create") return createIntegration.errors();
		return updateIntegration.errors();
	});

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (props.state.open && integration.isSuccess) {
			setName(integration.data?.data.name || "");
			setDescription(integration.data?.data.description || "");
			setEnabled(integration.data?.data.enabled || false);
			setExpiry(undefined);
			setScopes(integration.data?.data.scopes || []);
		}
	});

	// ----------------------------------------
	// Functions
	const groupIsSelected = (group: ExternalScopeGroup) =>
		group.scopes.every((scope) => getScopes().includes(scope.key));

	const toggleGroup = (group: ExternalScopeGroup) => {
		if (groupIsSelected(group)) {
			setScopes((scopes) =>
				scopes.filter(
					(scope) => !group.scopes.some((item) => item.key === scope),
				),
			);
			return;
		}

		setScopes((scopes) => [
			...new Set([...scopes, ...group.scopes.map((scope) => scope.key)]),
		]);
	};

	const toggleScope = (scope: ExternalScope) => {
		setScopes((scopes) =>
			scopes.includes(scope)
				? scopes.filter((selectedScope) => selectedScope !== scope)
				: [...scopes, scope],
		);
	};

	const submit = () => {
		if (mode() === "create") {
			createIntegration.action.mutate({
				name: getName(),
				description: getDescription(),
				enabled: getEnabled(),
				expiry: getExpiry() ?? "never",
				scopes: getScopes(),
			});
			return;
		}

		updateIntegration.action.mutate({
			id: props.id?.() as number,
			body: updateData().data,
		});
	};

	const reset = () => {
		setName("");
		setDescription("");
		setEnabled(true);
		setExpiry(mode() === "create" ? "never" : undefined);
		setScopes([]);
		createIntegration.reset();
		updateIntegration.reset();
	};

	// ----------------------------------------
	// Render
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
				onSubmit: submit,
				reset,
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
								label: T()("common.name"),
							}}
							required={true}
							errors={getBodyError("name", errors)}
							noMargin={true}
						/>
						<Select
							id="expiry"
							name="expiry"
							value={getExpiry()}
							onChange={(value) =>
								setExpiry(value as IntegrationExpiry | undefined)
							}
							options={[
								{
									value: "never",
									label: T()("integrations.expiry.never"),
								},
								{
									value: "30-days",
									label: T()("integrations.expiry.30.days"),
								},
								{
									value: "90-days",
									label: T()("integrations.expiry.90.days"),
								},
								{
									value: "1-year",
									label: T()("integrations.expiry.1.year"),
								},
							]}
							copy={{
								label: T()("integrations.expiry.label"),
							}}
							required={mode() === "create"}
							noClear={mode() === "create"}
							errors={getBodyError("expiry", errors)}
							noMargin={true}
						/>
					</InputGrid>
					<Textarea
						id="description"
						name="description"
						value={getDescription()}
						onChange={setDescription}
						copy={{
							label: T()("common.description"),
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
							label: T()("common.status.enabled"),
						}}
						errors={getBodyError("enabled", errors)}
						hideOptionalText={true}
					/>
					<div class="w-full mb-5 last:mb-0">
						<div class="mb-1.5">
							<h3 class="text-sm text-body">{T()("common.scopes")}</h3>
						</div>
						<div class="w-full">
							<For each={availableScopes.data?.data}>
								{(group) => (
									<div class="mb-3 last:mb-0 p-3 rounded-md border border-border bg-card-base">
										<div class="flex justify-between items-start gap-3">
											<h4 class="text-sm font-medium text-body">
												{helpers.getLocaleValue({ value: group.details.name })}
											</h4>
											<button
												type="button"
												class="text-xs text-unfocused hover:text-body transition-colors"
												onClick={() => toggleGroup(group)}
											>
												{groupIsSelected(group)
													? T()("common.clear")
													: T()("selectors.all")}
											</button>
										</div>
										<div class="mt-2 flex flex-wrap gap-2">
											<For each={group.scopes}>
												{(scope) => (
													<CheckboxButton
														id={`scope-${group.key}-${scope.key}`}
														value={getScopes().includes(scope.key)}
														onChange={() => toggleScope(scope.key)}
														copy={{
															label: helpers.getLocaleValue({
																value: scope.details.name,
															}),
														}}
														theme="secondary"
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

export default UpsertIntegrationPanel;
