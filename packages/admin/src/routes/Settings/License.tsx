import T from "@/translations";
import type { Component } from "solid-js";
import {
	Wrapper,
	NavigationTabs,
	DynamicContent,
} from "@/components/Groups/Layout";
import { Standard } from "@/components/Groups/Headers";
import { License as LicenseContent } from "@/components/Groups/Content";

const LicenseSettingsRoute: Component = () => {
	// ----------------------------------------
	// Render
	return (
		<Wrapper
			slots={{
				header: (
					<Standard
						copy={{
							title: T()("settings_route_title"),
							description: T()("settings_route_description"),
						}}
						slots={{
							bottom: (
								<NavigationTabs
									tabs={[
										{
											label: T()("general"),
											href: "/admin/settings",
										},
										{
											label: T()("client_integrations"),
											href: "/admin/settings/client-integrations",
										},
										{
											label: T()("license"),
											href: "/admin/settings/license",
										},
									]}
								/>
							),
						}}
					/>
				),
			}}
		>
			<DynamicContent
				options={{
					padding: "20",
				}}
			>
				<LicenseContent />
			</DynamicContent>
		</Wrapper>
	);
};

export default LicenseSettingsRoute;
