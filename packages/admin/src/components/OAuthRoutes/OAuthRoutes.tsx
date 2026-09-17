import type { ParentComponent } from "solid-js";
import AuthShell from "@/components/AuthShell/AuthShell";

const OAuthRoutes: ParentComponent = (props) => {
	// ----------------------------------------
	// Render
	return <AuthShell width="consent">{props.children}</AuthShell>;
};

export default OAuthRoutes;
