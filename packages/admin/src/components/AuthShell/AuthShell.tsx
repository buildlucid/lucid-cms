import classNames from "classnames";
import type { Component, JSXElement } from "solid-js";

const AuthShell: Component<{
	children?: JSXElement;
	width?: "auth" | "consent" | "wide";
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div class="min-h-screen flex bg-sidebar-base">
			<div class="px-2 pt-2 sm:px-4 sm:pt-4 grow">
				<div class="bg-background-base border border-border border-b-0 blur-background grow min-h-[calc(100vh-8px)] sm:min-h-[calc(100vh-16px)] flex items-center justify-center rounded-t-2xl">
					<div
						class={classNames("m-auto w-full grow", {
							"max-w-150 px-6 py-16 sm:px-10 sm:py-20":
								props.width === "auth" || props.width === undefined,
							"max-w-205 px-4 py-10 sm:px-8 sm:py-16":
								props.width === "consent",
							"max-w-none px-5 py-10 sm:px-8": props.width === "wide",
						})}
					>
						{props.children}
					</div>
				</div>
			</div>
		</div>
	);
};

export default AuthShell;
