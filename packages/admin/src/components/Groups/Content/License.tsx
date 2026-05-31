import classNames from "classnames";
import { FaSolidArrowsRotate } from "solid-icons/fa";
import { type Component, createMemo, Show } from "solid-js";
import InfoRow from "@/components/Blocks/InfoRow";
import UpdateLicenseForm from "@/components/Forms/System/UpdateLicenseForm";
import { DynamicContent } from "@/components/Groups/Layout";
import Button from "@/components/Partials/Button";
import DateText from "@/components/Partials/DateText";
import DetailsList from "@/components/Partials/DetailsList";
import Pill from "@/components/Partials/Pill";
import constants from "@/constants";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import userStore from "@/store/userStore";
import T from "@/translations";

export const License: Component = () => {
	// ----------------------------------------
	// Queries
	const status = api.license.useGetStatus({
		queryParams: {},
	});
	const verify = api.license.useVerify();

	// ----------------------------------------
	// Memos
	const license = createMemo(() => status.data?.data);
	const hasPermission = createMemo(
		() => userStore.get.hasPermission([Permissions.LicenseUpdate]).all,
	);
	const lastCheckedIso = createMemo(() => {
		const lastChecked = license()?.lastChecked;
		return lastChecked ? new Date(lastChecked * 1000).toISOString() : null;
	});

	// ----------------------------------------
	// Render
	return (
		<DynamicContent
			state={{
				isError: status.isError,
			}}
			options={{
				padding: "24",
			}}
		>
			<Show when={!status.isLoading} fallback={<LicenseSkeleton />}>
				<InfoRow.Root
					title={T()("license.manage.title")}
					description={T()("license.manage.description")}
				>
					<InfoRow.Content
						title={T()("license.purchase.title")}
						description={T()("license.purchase.description")}
						actionAlignment="center"
						reducedMargin={true}
						actions={
							<Button
								type="button"
								size="medium"
								theme="secondary"
								onClick={() => {
									window.open(constants.cmsMarketingPage, "_blank");
								}}
							>
								{T()("license.purchase.action")}
							</Button>
						}
					></InfoRow.Content>
					<InfoRow.Content
						title={T()(Permissions.LicenseUpdate)}
						description={T()("license.host.blurb")}
						reducedMargin={true}
					>
						<UpdateLicenseForm licenseKey={license()?.key || ""} />
					</InfoRow.Content>
					<InfoRow.Content
						title={T()("license.status.label")}
						description={T()("license.status.description")}
						reducedMargin={true}
					>
						<div class="flex flex-col gap-4">
							<DetailsList
								type="text"
								theme="contained"
								items={[
									{
										label: T()("license.status.label"),
										value: (
											<Pill
												theme={license()?.valid ? "primary-opaque" : "outline"}
											>
												{license()?.valid
													? T()("license.status.verified")
													: T()("license.status.unverified")}
											</Pill>
										),
									},
									{
										label: T()("license.key.saved"),
										value: license()?.key ?? T()("common.not.set"),
									},
									{
										label: T()("license.last.checked"),
										value: (
											<span class="flex flex-wrap items-center justify-end gap-2">
												<span>
													{lastCheckedIso() ? (
														<DateText
															date={lastCheckedIso()}
															includeTime={true}
														/>
													) : (
														T()("common.not.checked")
													)}
												</span>
												<Button
													type="button"
													size="icon-subtle"
													theme="border-outline"
													onClick={() => verify.action.mutate({})}
													loading={verify.action.isPending}
													permission={hasPermission()}
													aria-label={T()("license.status.verify.action")}
													title={T()("license.status.verify.action")}
												>
													<FaSolidArrowsRotate
														size={11}
														class={classNames({
															"animate-spin": verify.action.isPending,
														})}
													/>
												</Button>
											</span>
										),
									},
									{
										label: T()("common.ai.features"),
										value: (
											<Pill
												theme={
													license()?.ai.enabled ? "primary-opaque" : "outline"
												}
											>
												{license()?.ai.enabled
													? T()("common.status.enabled")
													: T()("common.status.disabled")}
											</Pill>
										),
									},
									{
										label: T()("common.message"),
										value:
											license()?.errorMessage ||
											T()("license.status.invalid.message"),
										show: license()?.valid === false,
										stacked: true,
									},
								]}
							/>
						</div>
					</InfoRow.Content>
				</InfoRow.Root>
			</Show>
		</DynamicContent>
	);
};

const LicenseSkeleton: Component = () => {
	return (
		<InfoRow.Root
			title={T()("license.manage.title")}
			description={T()("license.manage.description")}
		>
			<InfoRow.Content>
				<div class="flex items-center justify-between gap-6">
					<div class="w-full max-w-3xl">
						<span class="skeleton mb-3 block h-5 w-44" />
						<span class="skeleton mb-2 block h-4 w-full max-w-xl" />
						<span class="skeleton block h-4 w-full max-w-lg" />
					</div>
					<span class="skeleton hidden h-10 w-32 shrink-0 md:block" />
				</div>
			</InfoRow.Content>
			<InfoRow.Content>
				<span class="skeleton mb-3 block h-5 w-36" />
				<span class="skeleton mb-4 block h-4 w-full max-w-lg" />
				<span class="skeleton block h-10 w-full" />
			</InfoRow.Content>
			<InfoRow.Content>
				<span class="skeleton mb-3 block h-5 w-36" />
				<span class="skeleton mb-5 block h-4 w-full max-w-xl" />
				<div class="flex flex-col gap-3">
					<span class="skeleton block h-5 w-full" />
					<span class="skeleton block h-5 w-full" />
					<span class="skeleton block h-5 w-full" />
					<span class="skeleton block h-5 w-full" />
				</div>
			</InfoRow.Content>
		</InfoRow.Root>
	);
};
