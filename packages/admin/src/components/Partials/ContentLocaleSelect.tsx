import { type Component, Match, Switch, createMemo } from "solid-js";
import contentLocaleStore from "@/store/contentLocaleStore";
import Form from "@/components/Groups/Form";

interface ContentLocaleSelectProps {
	value?: string | undefined;
	setValue?: (_value: string | undefined) => void;
	hasError?: boolean;
}

const ContentLocaleSelect: Component<ContentLocaleSelectProps> = (props) => {
	// ----------------------------------
	// Memos
	const contentLocale = createMemo(() => contentLocaleStore.get.contentLocale);
	const locales = createMemo(() => contentLocaleStore.get.locales);
	const options = createMemo(() => {
		return (
			locales().map((l) => ({
				value: l.code,
				label: `${
					l.name ? `${l.name} (${l.code})` : l.code
				} ${l.isDefault ? "(Default)" : ""}`,
			})) || []
		);
	});

	// ----------------------------------------
	// Render
	return (
		<Switch>
			<Match when={props.value === undefined}>
				<Form.Select
					id={"content-locale"}
					value={contentLocale()}
					onChange={(value) => {
						if (!value) contentLocaleStore.get.setContentLocale(undefined);
						else contentLocaleStore.get.setContentLocale(value.toString());
					}}
					name={"content-locale"}
					options={options()}
					noMargin={true}
					noClear={true}
					hasError={props.hasError}
					theme="basic-small"
				/>
			</Match>
			<Match when={props.value !== undefined}>
				<Form.Select
					id={"content-locale"}
					value={props.value}
					onChange={(value) => {
						if (!value) props.setValue?.(undefined);
						else props.setValue?.(value.toString());
					}}
					name={"content-locale"}
					options={options()}
					noMargin={true}
					noClear={true}
					hasError={props.hasError}
					theme="basic-small"
				/>
			</Match>
		</Switch>
	);
};

export default ContentLocaleSelect;
