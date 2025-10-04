import T from "@/translations";
import type { Component } from "solid-js";
import { Wrapper } from "@/components/Groups/Layout";
import { Standard } from "@/components/Groups/Headers";
import { License as LicenseContent } from "@/components/Groups/Content";

const SystemLicenseRoute: Component = () => {
	// ----------------------------------------
	// Render
	return (
		<Wrapper
			slots={{
				header: (
					<Standard
						copy={{
							title: T()("system_license_route_title"),
							description: T()("system_license_route_description"),
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
