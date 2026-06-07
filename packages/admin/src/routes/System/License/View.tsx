import type { Component } from "solid-js";
import SystemSettingsHeader from "@/components/Blocks/SystemSettingsHeader";
import { License as LicenseContent } from "@/components/Groups/Content";
import { Wrapper } from "@/components/Groups/Layout";

const SystemLicenseRoute: Component = () => {
	// ----------------------------------------
	// Render
	return (
		<Wrapper
			slots={{
				header: <SystemSettingsHeader />,
			}}
		>
			<LicenseContent />
		</Wrapper>
	);
};

export default SystemLicenseRoute;
