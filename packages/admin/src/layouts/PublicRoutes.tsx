import type { Component, JSXElement } from "solid-js";

interface PublicRoutesProps {
	children?: JSXElement;
}

const PublicRoutes: Component<PublicRoutesProps> = (props) => {
	return (
		<div class="min-h-screen flex bg-sidebar-base">
			<div class="px-4 pt-4 grow">
				<div class="bg-background-base border border-border border-b-0 blur-background grow h-full flex items-center justify-center rounded-t-2xl">
					<div class="m-auto px-8 py-10 w-full grow max-w-none">
						{props.children}
					</div>
				</div>
			</div>
		</div>
	);
};

export default PublicRoutes;
