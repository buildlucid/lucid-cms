import T from "@/translations";
import {
	type Accessor,
	type Component,
	createEffect,
	createMemo,
	createSignal,
} from "solid-js";
import api from "@/services/api";
import helpers from "@/utils/helpers";
import { getBodyError } from "@/utils/error-helpers";
import { Panel } from "@/components/Groups/Panel";
import { Checkbox, Input, Textarea } from "@/components/Groups/Form";

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
		}
	});

	// ---------------------------------
	// Memos
	const mode = createMemo(() => {
		if (props.id === undefined || props.id() === undefined) return "create";
		return "update";
	});
	const isLoading = createMemo(() => {
		if (mode() === "create") return false;
		return clientIntegration.isLoading;
	});
	const isError = createMemo(() => {
		if (mode() === "create") return false;
		return clientIntegration.isError;
	});

	const panelTitle = createMemo(() => {
		if (mode() === "create")
			return T()("create_client_integration_panel_title");
		return T()("update_client_integration_panel_title");
	});
	const panelDescription = createMemo(() => {
		if (mode() === "create")
			return T()("create_client_integration_panel_description");
		return T()("update_client_integration_panel_description");
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
			},
			{
				name: getName(),
				description: getDescription(),
				enabled: getEnabled(),
			},
		);
	});
	const submitIsDisabled = createMemo(() => {
		if (mode() === "create") return false;
		return !updateData().changed;
	});
	// Mutation memos
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
					createClientIntegration.reset();
					updateClientIntegration.reset();
				},
			}}
			copy={{
				title: panelTitle(),
				description: panelDescription(),
				submit: panelSubmit(),
			}}
			options={{
				padding: "24",
			}}
		>
			{() => (
				<>
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
					/>
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
					<Checkbox
						id="enabled"
						name="enabled"
						value={getEnabled()}
						onChange={(value) => setEnabled(value)}
						copy={{
							label: T()("enabled"),
						}}
						errors={getBodyError("enabled", errors)}
					/>
				</>
			)}
		</Panel>
	);
};

export default UpsertClientIntegrationPanel;
