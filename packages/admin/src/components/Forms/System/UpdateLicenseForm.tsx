import { FaSolidXmark } from "solid-icons/fa";
import { type Component, createMemo, createSignal, Show } from "solid-js";
import { Form, Input } from "@/components/Groups/Form";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import userStore from "@/store/userStore";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";
import helpers from "@/utils/helpers";

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
		() => userStore.get.hasPermission([Permissions.LicenseUpdate]).all,
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
	const showClearAction = createMemo(() => {
		return props.licenseKey.length > 0 || licenseKey().length > 0;
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
			options={{
				buttonSize: "medium",
				errorPlacement: "inline",
				hideSubmitWhenDisabled: true,
			}}
			permission={hasPermission()}
			onSubmit={() => {
				updateLicense.action.mutate({ licenseKey: licenseKey() || null });
			}}
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
				minLength={8}
				maxLength={256}
				rightAction={
					<Show when={showClearAction()}>
						<button
							type="button"
							class="absolute right-2.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded-full text-icon-fade opacity-0 transition-[opacity,color,background-color] duration-200 hover:bg-error-base/10 hover:text-error-base focus:opacity-100 focus-visible:ring-1 focus-visible:ring-primary-base group-hover:opacity-100"
							aria-label={T()("clear")}
							title={T()("clear")}
							onClick={() => {
								if (licenseKey().length > 0) {
									setLicenseKey("");
									return;
								}

								updateLicense.action.mutate({ licenseKey: null });
							}}
							disabled={updateLicense.action.isPending}
						>
							<FaSolidXmark class="size-3" />
						</button>
					</Show>
				}
			/>
		</Form>
	);
};

export default UpdateLicenseForm;
