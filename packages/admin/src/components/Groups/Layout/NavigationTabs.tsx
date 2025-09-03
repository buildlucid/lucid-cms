import { type Component, For } from "solid-js";
import { A } from "@solidjs/router";
// Components

interface NavigationTabsProps {
	tabs: {
		label: string;
		href?: string;
		onClick?: () => void;
	}[];
}

export const NavigationTabs: Component<NavigationTabsProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<nav class="px-4 md:px-6">
			<ul class="flex flex-row flex-wrap justify-start items-center">
				<For each={props.tabs}>
					{(tab) => (
						<li class="mr-4">
							<A
								class="flex pb-2.5 font-medium text-body border-b-2 border-transparent hover:border-primary-base transition-colors duration-200"
								activeClass="border-primary-base! text-title"
								href={tab.href || "#"}
								onClick={tab.onClick}
								end
							>
								{tab.label}
							</A>
						</li>
					)}
				</For>
			</ul>
		</nav>
	);
};
