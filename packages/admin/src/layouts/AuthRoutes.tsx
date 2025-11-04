import { useNavigate } from "@solidjs/router";
import { type Component, createEffect, type JSXElement } from "solid-js";
import api from "@/services/api";

interface AuthRoutesProps {
	children?: JSXElement;
}

const AuthRoutes: Component<AuthRoutesProps> = (props) => {
	// ----------------------------------
	// State & Hooks
	const navigate = useNavigate();

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
			navigate("/admin");
		}
	});

	// ----------------------------------
	// Render
	return (
		<div class="min-h-screen flex bg-sidebar-base">
			<div class="px-4 pt-4 grow">
				<div class="bg-background-base border border-border border-b-0 blur-background grow h-full flex items-center justify-center rounded-t-2xl">
					<div class="m-auto px-10 py-20 w-full grow max-w-[600px]">
						{props.children}
					</div>
				</div>
			</div>
		</div>
	);
};

export default AuthRoutes;
