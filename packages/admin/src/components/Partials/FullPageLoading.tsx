import type { Component } from "solid-js";
import LogoColumn from "@assets/svgs/logo-column.svg";

const FullPageLoading: Component = () => {
	return (
		<div class="fixed inset-0 z-50 bg-background-base flex items-center justify-center">
			<div class="absolute inset-0 z-20 flex-col flex items-center justify-center">
				<img src={LogoColumn} alt="Lucid CMS Logo" class="h-24 animate-pulse" />
			</div>
		</div>
	);
};

export default FullPageLoading;
