import { useLocation, useNavigate } from "@solidjs/router";
import { type Component, createEffect, type JSXElement } from "solid-js";
import api from "@/services/api";
import { getLoginReturnPath } from "@/utils/login-route";
import AuthShell from "./AuthShell";

interface AuthRoutesProps {
	children?: JSXElement;
}

const AuthRoutes: Component<AuthRoutesProps> = (props) => {
	// ----------------------------------
	// State & Hooks
	const navigate = useNavigate();
	const location = useLocation();

	// ----------------------------------
	// Mutations & Queries
	const authenticatedUser = api.account.useGetAuthenticatedUser(
		{
			queryParams: {},
		},
		{
			authLayout: true,
		},
	);

	// ----------------------------------
	// Effects
	createEffect(() => {
		if (authenticatedUser.isSuccess) {
			navigate(getLoginReturnPath(location.search));
		}
	});

	// ----------------------------------
	// Render
	return <AuthShell width="auth">{props.children}</AuthShell>;
};

export default AuthRoutes;
