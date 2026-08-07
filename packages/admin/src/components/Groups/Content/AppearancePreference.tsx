import { type Component, createMemo } from "solid-js";
import { Select } from "@/components/Groups/Form/Select";
import themeStore, { type ThemePreference } from "@/store/themeStore";
import T from "@/translations";

const isThemePreference = (value: unknown): value is ThemePreference =>
	value === "system" || value === "light" || value === "dark";

export const AppearancePreference: Component = () => {
	// ----------------------------------------
	// Memos
	const options = createMemo<Array<{ label: string; value: ThemePreference }>>(
		() => [
			{
				label: T()("settings.interface.cms.appearance.system"),
				value: "system",
			},
			{
				label: T()("settings.interface.cms.appearance.light"),
				value: "light",
			},
			{
				label: T()("settings.interface.cms.appearance.dark"),
				value: "dark",
			},
		],
	);

	// ----------------------------------------
	// Render
	return (
		<Select
			id="cms-appearance"
			value={themeStore.preference()}
			options={options()}
			onChange={(value) => {
				if (isThemePreference(value)) themeStore.setThemePreference(value);
			}}
			name="cms-appearance"
			noClear={true}
		/>
	);
};
