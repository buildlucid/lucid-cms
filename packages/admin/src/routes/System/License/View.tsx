import type { Component } from "solid-js";
import { License as LicenseContent } from "@/components/Groups/Content";
import { Standard } from "@/components/Groups/Headers";
import { Wrapper } from "@/components/Groups/Layout";
import T from "@/translations";

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
