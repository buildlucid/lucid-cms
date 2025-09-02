import T from "@/translations";
import type { Component } from "solid-js";
import InfoRow from "@/components/Blocks/InfoRow";
import { DynamicContent } from "@/components/Groups/Layout";
import api from "@/services/api";
import UpdateLicenseForm from "@/components/Forms/Settings/UpdateLicenseForm";
import constants from "@/constants";
import Button from "@/components/Partials/Button";

export const License: Component = () => {
	// ----------------------------------------
	// Queries
	const status = api.license.useGetStatus({
		queryParams: {},
	});

	// ----------------------------------------
	// Render
	return (
		<DynamicContent
			state={{
				isError: status.isError,
				isSuccess: status.isSuccess,
				isLoading: status.isLoading,
			}}
			options={{
				padding: "20",
			}}
		>
			<InfoRow.Root
				title={T()("license")}
				description={T()("license_description")}
			>
				<InfoRow.Content
					title={T()("purchase_license")}
					description={T()("purchase_license_description")}
				>
					<div class="flex items-center gap-10">
						<Button
							type="button"
							size="small"
							theme="primary"
							onClick={() => {
								window.open(constants.cmsMarketingPage, "_blank");
							}}
						>
							{T()("purchase_license_button")}
						</Button>
					</div>
				</InfoRow.Content>

				<InfoRow.Content>
					<UpdateLicenseForm licenseKey={status.data?.data?.key || ""} />
				</InfoRow.Content>
			</InfoRow.Root>
		</DynamicContent>
	);
};
