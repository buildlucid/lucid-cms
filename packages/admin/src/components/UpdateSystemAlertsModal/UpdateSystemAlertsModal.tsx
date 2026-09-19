import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
} from "solid-js";
import Button from "@/components/Button/Button";
import ErrorMessage from "@/components/ErrorMessage/ErrorMessage";
import { Input } from "@/components/Input/Input";
import { Modal } from "@/components/Modal/Modal";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";

interface UpdateSystemAlertsProps {
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	alertEmail: string | null;
}

const UpdateSystemAlertsModal: Component<UpdateSystemAlertsProps> = (props) => {
	// ----------------------------------------
	// State
	const [alertEmail, setAlertEmail] = createSignal(props.alertEmail ?? "");

	// ----------------------------------------
	// Mutations
	const updateSystemAlerts = api.settings.useUpdateSystemAlerts({
		onSuccess: () => {
			props.state.setOpen(false);
		},
	});

	// ----------------------------------------
	// Memos
	const normalizedCurrent = createMemo(() => props.alertEmail ?? "");
	const normalizedInput = createMemo(() => alertEmail().trim());
	const submitIsDisabled = createMemo(
		() => normalizedCurrent() === normalizedInput(),
	);

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!props.state.open) return;

		setAlertEmail(props.alertEmail ?? "");
		updateSystemAlerts.reset();
	});

	// ----------------------------------------
	// Handlers
	const closeModal = () => {
		props.state.setOpen(false);
		updateSystemAlerts.reset();
	};

	// ----------------------------------------
	// Render
	return (
		<Modal.Root open={props.state.open} onOpenChange={props.state.setOpen}>
			<form
				class="w-full"
				onSubmit={(event) => {
					event.preventDefault();
					updateSystemAlerts.action.mutate({
						alertEmail: normalizedInput() || null,
					});
				}}
			>
				<Modal.Header>
					<Modal.Title>{T()("system.alerts.edit.title")}</Modal.Title>
					<Modal.Description>
						{T()("system.alerts.edit.description")}
					</Modal.Description>
				</Modal.Header>
				<Modal.Body class="flex flex-col gap-3">
					{/* Field */}
					<Input
						id="system-alert-email"
						name="alertEmail"
						type="email"
						value={alertEmail()}
						onChange={setAlertEmail}
						label={T()("common.alert.email")}
						placeholder={"alerts@example.com"}
						errors={getBodyError("alertEmail", updateSystemAlerts.errors)}
					/>

					{/* Error */}
					<ErrorMessage
						theme="basic"
						message={updateSystemAlerts.errors()?.message}
					/>
				</Modal.Body>

				<Modal.Footer>
					<Modal.Actions>
						<Button
							type="button"
							variant="outline"
							size="md"
							disabled={updateSystemAlerts.action.isPending}
							onClick={closeModal}
						>
							{T()("common.cancel")}
						</Button>
						<Button
							type="submit"
							variant="primary"
							size="md"
							loading={updateSystemAlerts.action.isPending}
							disabled={submitIsDisabled()}
							permission={Permissions.SettingsUpdate}
						>
							{T()("common.save")}
						</Button>
					</Modal.Actions>
				</Modal.Footer>
			</form>
		</Modal.Root>
	);
};

export default UpdateSystemAlertsModal;
