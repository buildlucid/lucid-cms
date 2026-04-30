import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
} from "solid-js";
import { Form, Input } from "@/components/Groups/Form";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import userStore from "@/store/userStore";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";

const UpdateSystemAlertsForm: Component<{
	alertEmail: string | null;
}> = (props) => {
	// ----------------------------------------
	// State
	const [alertEmail, setAlertEmail] = createSignal(props.alertEmail ?? "");

	// ----------------------------------------
	// Mutations
	const updateSystemAlerts = api.settings.useUpdateSystemAlerts();

	// ----------------------------------------
	// Effects
	createEffect(() => {
		setAlertEmail(props.alertEmail ?? "");
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
	// Handlers
	const handleSubmit = () => {
		updateSystemAlerts.action.mutate({
			alertEmail: normalizedInput() || null,
		});
	};

	// ----------------------------------------
	// Render
	return (
		<Form
			state={{
				isLoading: updateSystemAlerts.action.isPending,
				errors: updateSystemAlerts.errors(),
				isDisabled: submitIsDisabled(),
			}}
			content={{
				submit: T()("save"),
			}}
			options={{
				hideSubmitWhenDisabled: true,
			}}
			permission={hasPermission()}
			onSubmit={handleSubmit}
		>
			<Input
				id="alertEmail"
				name="alertEmail"
				type="email"
				value={alertEmail()}
				onChange={setAlertEmail}
				copy={{
					label: T()("alert_email"),
					placeholder: "alerts@example.com",
				}}
				errors={getBodyError("alertEmail", updateSystemAlerts.errors)}
				hideOptionalText={true}
				noMargin={true}
			/>
		</Form>
	);
};

export default UpdateSystemAlertsForm;
