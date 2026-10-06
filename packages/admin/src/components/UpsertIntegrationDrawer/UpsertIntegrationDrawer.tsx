import type { IntegrationExpiry } from "@types";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Show,
} from "solid-js";
import Button from "@/components/Button/Button";
import Drawer from "@/components/Drawer/Drawer";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import GrantPicker from "@/components/GrantPicker/GrantPicker";
import Input from "@/components/Input/Input";
import InputGrid from "@/components/InputGrid/InputGrid";
import Select from "@/components/Select/Select";
import Switch from "@/components/Switch/Switch";
import Textarea from "@/components/Textarea/Textarea";
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

const UpsertIntegrationDrawer: Component<UpsertIntegrationPanelProps> = (
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
	const [getScopes, setScopes] = createSignal<string[]>([]);
	const [activeTab, setActiveTab] = createSignal("details");

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
	const scopeGroups = createMemo(() =>
		(availableScopes.data?.data ?? []).map((group) => ({
			key: group.key,
			details: group.details,
			grants: group.scopes,
		})),
	);

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
	const tabInvalid = (fields: string[]) =>
		fields.some((field) => getBodyError(field, errors) !== undefined);

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
		setActiveTab("details");
		createIntegration.reset();
		updateIntegration.reset();
	};

	// ----------------------------------------
	// Render
	return (
		<Drawer.Root
			open={props.state.open}
			onOpenChange={props.state.setOpen}
			loading={isLoading()}
			error={isError() ? T()("errors.generic.message") : undefined}
			onReset={reset}
		>
			<Drawer.Header border={false}>
				<Drawer.Title>{panelTitle()}</Drawer.Title>
			</Drawer.Header>
			<Drawer.Form onSubmit={submit}>
				<Drawer.Body class="flex flex-col gap-3">
					<Drawer.Tabs
						items={[
							{
								value: "details",
								label: T()("common.details"),
								invalid: tabInvalid([
									"name",
									"expiry",
									"description",
									"enabled",
								]),
							},
							{
								value: "scopes",
								label: T()("common.scopes"),
								invalid: tabInvalid(["scopes"]),
							},
						]}
						value={activeTab()}
						onChange={setActiveTab}
					/>
					<Show when={activeTab() === "details"}>
						<InputGrid columns={2}>
							<Input
								id="name"
								name="name"
								type="text"
								value={getName()}
								onChange={setName}
								label={T()("common.name")}
								required={true}
								errors={getBodyError("name", errors)}
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
								label={T()("integrations.expiry.label")}
								required={mode() === "create"}
								errors={getBodyError("expiry", errors)}
							/>
						</InputGrid>
						<Textarea
							id="description"
							name="description"
							value={getDescription()}
							onChange={setDescription}
							label={T()("common.description")}
							rows={3}
							errors={getBodyError("description", errors)}
						/>
						<Switch
							id="enabled"
							name="enabled"
							value={getEnabled()}
							onChange={(value) => setEnabled(value)}
							label={T()("common.status.enabled")}
							errors={getBodyError("enabled", errors)}
						/>
					</Show>
					<Show when={activeTab() === "scopes"}>
						<GrantPicker
							id="scopes"
							groups={scopeGroups()}
							value={getScopes()}
							onChange={setScopes}
						/>
					</Show>
				</Drawer.Body>
				<Drawer.Footer>
					<ErrorMessage theme="basic" message={errors()?.message} />
					<Drawer.Actions>
						<Button
							size="md"
							variant="outline"
							onClick={() => props.state.setOpen(false)}
						>
							{T()("common.close")}
						</Button>
						<Button
							type="submit"
							variant="primary"
							size="md"
							loading={isCreating()}
							disabled={submitIsDisabled()}
						>
							{panelSubmit()}
						</Button>
					</Drawer.Actions>
				</Drawer.Footer>
			</Drawer.Form>
		</Drawer.Root>
	);
};

export default UpsertIntegrationDrawer;
