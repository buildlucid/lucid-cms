import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
} from "solid-js";
import { Input } from "@/components/Groups/Form";
import { Modal, ModalFooter } from "@/components/Groups/Modal";
import Button from "@/components/Partials/Button";
import ErrorMessage from "@/components/Partials/ErrorMessage";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import userStore from "@/store/userStore";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";

interface UpdateSystemAlertsProps {
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	alertEmail: string | null;
}

const UpdateSystemAlerts: Component<UpdateSystemAlertsProps> = (props) => {
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
	const hasPermission = createMemo(
		() => userStore.get.hasPermission([Permissions.SettingsUpdate]).all,
	);
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
		<Modal
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
			}}
			options={{
				noPadding: true,
			}}
		>
			<form
				class="w-full"
				onSubmit={(event) => {
					event.preventDefault();
					updateSystemAlerts.action.mutate({
						alertEmail: normalizedInput() || null,
					});
				}}
			>
				<div class="p-4 md:p-6">
					{/* Header */}
					<div class="mb-5">
						<h2 class="text-base font-semibold text-title">
							{T()("system.alerts.edit.title")}
						</h2>
						<p class="mt-1 text-sm text-body">
							{T()("system.alerts.edit.description")}
						</p>
					</div>

					{/* Field */}
					<Input
						id="system-alert-email"
						name="alertEmail"
						type="email"
						value={alertEmail()}
						onChange={setAlertEmail}
						copy={{
							label: T()("common.alert.email"),
							placeholder: "alerts@example.com",
						}}
						errors={getBodyError("alertEmail", updateSystemAlerts.errors)}
						hideOptionalText={true}
						noMargin={true}
					/>

					{/* Error */}
					<ErrorMessage
						theme="basic"
						message={updateSystemAlerts.errors()?.message}
						classes="mt-4"
					/>
				</div>

				{/* Footer */}
				<ModalFooter>
					<div />
					<div class="flex gap-2.5">
						<Button
							type="button"
							theme="border-outline"
							size="medium"
							disabled={updateSystemAlerts.action.isPending}
							onClick={closeModal}
						>
							{T()("common.cancel")}
						</Button>
						<Button
							type="submit"
							theme="primary"
							size="medium"
							loading={updateSystemAlerts.action.isPending}
							disabled={submitIsDisabled()}
							permission={hasPermission()}
						>
							{T()("common.save")}
						</Button>
					</div>
				</ModalFooter>
			</form>
		</Modal>
	);
};

export default UpdateSystemAlerts;
