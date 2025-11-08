import T from "@/translations";
import { type Component, createMemo, createSignal, Show } from "solid-js";
import { Form, Input } from "@/components/Groups/Form";
import Button from "@/components/Partials/Button";
import { getBodyError } from "@/utils/error-helpers";
import helpers from "@/utils/helpers";
import api from "@/services/api";
import userStore from "@/store/userStore";

const UpdateLicenseForm: Component<{
	licenseKey: string;
}> = (props) => {
	// ----------------------------------------
	// State
	const [licenseKey, setLicenseKey] = createSignal("");

	// ----------------------------------------
	// Mutations
	const updateLicense = api.license.useUpdate({
		onSuccess: () => {
			setLicenseKey("");
		},
	});

	// ----------------------------------------
	// Memos
	const hasPermission = createMemo(
		() => userStore.get.hasPermission(["update_license"]).all,
	);
	const placeholder = createMemo(() => props.licenseKey || "");
	const updateData = createMemo(() => {
		return helpers.updateData(
			{
				licenseKey: "",
			},
			{
				licenseKey: licenseKey(),
			},
		);
	});
	const submitIsDisabled = createMemo(() => {
		return !updateData().changed && licenseKey().length === 0;
	});
	const clearIsDisabled = createMemo(() => {
		return props.licenseKey.length === 0;
	});

	// ----------------------------------------
	// Render
	return (
		<Form
			state={{
				isLoading: updateLicense.action.isPending,
				errors: updateLicense.errors(),
				isDisabled: submitIsDisabled(),
			}}
			content={{
				submit: T()("save"),
			}}
			permission={hasPermission()}
			onSubmit={() => {
				updateLicense.action.mutate({ licenseKey: licenseKey() || null });
			}}
			submitRow={
				<Button
					type="button"
					theme="danger-outline"
					size="medium"
					onClick={() => {
						setLicenseKey("");
						updateLicense.action.mutate({ licenseKey: null });
					}}
					permission={hasPermission()}
					disabled={clearIsDisabled()}
				>
					{T()("clear")}
				</Button>
			}
		>
			<Input
				id="licenseKey"
				name="licenseKey"
				type="text"
				value={licenseKey()}
				onChange={setLicenseKey}
				copy={{
					label: T()("license"),
					placeholder: placeholder(),
				}}
				errors={getBodyError("licenseKey", updateLicense.errors)}
				hideOptionalText={true}
				noMargin={true}
				disabled={!clearIsDisabled()}
			/>
		</Form>
	);
};

export default UpdateLicenseForm;
