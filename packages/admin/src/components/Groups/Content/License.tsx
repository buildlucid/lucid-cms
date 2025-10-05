import T from "@/translations";
import { Show, type Component } from "solid-js";
import InfoRow from "@/components/Blocks/InfoRow";
import { DynamicContent } from "@/components/Groups/Layout";
import api from "@/services/api";
import UpdateLicenseForm from "@/components/Forms/System/UpdateLicenseForm";
import constants from "@/constants";
import Button from "@/components/Partials/Button";
import classNames from "classnames";
import { FaSolidTriangleExclamation } from "solid-icons/fa";

export const License: Component = () => {
	// ----------------------------------------
	// Queries
	const status = api.license.useGetStatus({
		queryParams: {},
	});
	const verify = api.license.useVerify();

	// ----------------------------------------
	// Render
	return (
		<DynamicContent
			state={{
				isError: status.isError,
				isSuccess: status.isSuccess,
				isLoading: status.isFetching,
			}}
			options={{
				padding: "24",
			}}
		>
			<InfoRow.Root
				title={T()("manage_license")}
				description={T()("manage_license_description")}
			>
				<InfoRow.Content
					title={T()("purchase_license")}
					description={T()("purchase_license_description")}
				>
					<Button
						type="button"
						size="medium"
						theme="secondary"
						onClick={() => {
							window.open(constants.cmsMarketingPage, "_blank");
						}}
					>
						{T()("purchase_license_button")}
					</Button>
				</InfoRow.Content>
				<InfoRow.Content
					title={T()("update_license")}
					description={T()("license_host_blurb")}
				>
					<UpdateLicenseForm licenseKey={status.data?.data?.key || ""} />
				</InfoRow.Content>
				<InfoRow.Content
					title={T()("license_status")}
					description={T()("license_status_description")}
				>
					<div class="flex flex-col gap-4">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<span
									class={classNames("inline-block w-3 h-3 rounded-full", {
										"bg-primary-base": status.data?.data?.valid,
										"bg-error-base": !status.data?.data?.valid,
									})}
									aria-hidden="true"
								/>
								<p class="text-sm">
									{status.data?.data?.valid
										? T()("license_verified")
										: T()("license_unverified")}
								</p>
							</div>
							<Button
								type="button"
								size="medium"
								theme="border-outline"
								onClick={() => verify.action.mutate({})}
								loading={verify.action.isPending}
							>
								{T()("refresh_license_status")}
							</Button>
						</div>
						<Show when={!status.data?.data?.valid}>
							<div class="flex items-center border-t border-border pt-4">
								<FaSolidTriangleExclamation
									size={14}
									class="text-error-base mr-2"
								/>

								<p class="text-sm text-error-base">
									{status.data?.data?.errorMessage ||
										T()("license_invalid_message")}
								</p>
							</div>
						</Show>
					</div>
				</InfoRow.Content>
			</InfoRow.Root>
		</DynamicContent>
	);
};
