import { type Component, createMemo } from "solid-js";
import { License as LicenseContent } from "@/components/Groups/Content";
import { Standard } from "@/components/Groups/Headers";
import { NavigationTabs, Wrapper } from "@/components/Groups/Layout";
import { Permissions } from "@/constants/permissions";
import userStore from "@/store/userStore";
import T from "@/translations";

const SystemLicenseRoute: Component = () => {
	// ----------------------------------------
	// Memos
	const canReadSystemOverview = createMemo(
		() => userStore.get.hasPermission([Permissions.SettingsRead]).all,
	);
	const canReadSystemOperations = createMemo(
		() => userStore.get.hasPermission([Permissions.SettingsRead]).all,
	);
	const canManageLicense = createMemo(
		() => userStore.get.hasPermission([Permissions.LicenseUpdate]).all,
	);

	// ----------------------------------------
	// Render
	return (
		<Wrapper
			slots={{
				header: (
					<Standard
						copy={{
							title: T()("routes.system.settings.title"),
							description: T()("routes.system.settings.description"),
						}}
						slots={{
							bottom: (
								<NavigationTabs
									tabs={[
										{
											label: T()("common.overview"),
											href: "/lucid/system/overview",
											permission: canReadSystemOverview(),
										},
										{
											label: T()("common.operations"),
											href: "/lucid/system/operations",
											permission: canReadSystemOperations(),
										},
										{
											label: T()("common.license"),
											href: "/lucid/system/license",
											permission: canManageLicense(),
										},
									]}
								/>
							),
						}}
					/>
				),
			}}
		>
			<LicenseContent />
		</Wrapper>
	);
};

export default SystemLicenseRoute;
