import LogoDark from "@assets/svgs/logo-icon.svg?url";
import LogoLight from "@assets/svgs/logo-icon-light.svg?url";
import classNames from "classnames";
import type { Component } from "solid-js";

interface ThemeLogoIconProps {
	class?: string;
	alt?: string;
}

const ThemeLogoIcon: Component<ThemeLogoIconProps> = (props) => (
	<>
		<img
			src={LogoLight}
			alt={props.alt ?? "Lucid CMS Logo"}
			class={classNames(props.class, "dark:hidden")}
		/>
		<img
			src={LogoDark}
			alt={props.alt ?? "Lucid CMS Logo"}
			class={classNames(props.class, "hidden dark:block")}
		/>
	</>
);

export default ThemeLogoIcon;
