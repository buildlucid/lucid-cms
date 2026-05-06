import type {
	CFConfig,
	FieldTypes,
	InternalCollectionDocument,
	UserRef,
} from "@types";
import { type Component, createMemo, Match, Show, Switch } from "solid-js";
import contentLocaleStore from "@/store/contentLocaleStore";
import T from "@/translations";
import brickHelpers from "@/utils/brick-helpers";
import AuthorCol from "./AuthorCol";
import DateCol from "./DateCol";
import PillCol from "./PillCol";
import TextCol from "./TextCol";

const DocumentDynamicColumns: Component<{
	field: CFConfig<Exclude<FieldTypes, "repeater" | "tab">>;
	document: InternalCollectionDocument;
	include: boolean[];
	index: number;
	collectionTranslations: boolean;
}> = (props) => {
	// ----------------------------------
	// Memos
	const contentLocale = createMemo(
		() => contentLocaleStore.get.contentLocale ?? "",
	);
	const fieldData = createMemo(() => {
		return props.document.fields?.find((f) => f.key === props.field.key);
	});
	const fieldValue = createMemo(() => {
		return brickHelpers.getFieldValue({
			fieldData: fieldData(),
			fieldConfig: props.field,
			contentLocale: contentLocale(),
			collectionTranslations: props.collectionTranslations,
		});
	});
	const datetimeField = createMemo(() =>
		props.field.type === "datetime" ? props.field : undefined,
	);
	const textValue = createMemo(() =>
		typeof fieldValue() === "string" ? (fieldValue() as string) : undefined,
	);
	const datetimeValue = createMemo(() =>
		typeof fieldValue() === "string" || typeof fieldValue() === "number"
			? (String(fieldValue()) as string)
			: null,
	);
	const fieldRef = createMemo(() => {
		if (props.field.type !== "user") return null;

		const relationValues = fieldValue();
		const value = Array.isArray(relationValues)
			? brickHelpers.getFirstRelationValue(relationValues)
			: undefined;
		if (value === undefined) return null;

		const refs = props.document.refs?.user;
		if (!refs) return null;

		return (
			refs.find(
				(ref): ref is UserRef =>
					ref !== null &&
					ref !== undefined &&
					"username" in ref &&
					"email" in ref &&
					"firstName" in ref &&
					"lastName" in ref &&
					"profilePicture" in ref &&
					ref.id === value,
			) ?? null
		);
	});

	// ----------------------------------
	// Render
	return (
		<Switch
			fallback={
				<TextCol text="~" options={{ include: props.include[props.index] }} />
			}
		>
			<Match when={fieldData()?.type === "text" ? textValue() : undefined}>
				{(text) => (
					<TextCol
						text={text()}
						options={{ include: props.include[props.index] }}
					/>
				)}
			</Match>
			<Match when={fieldData()?.type === "textarea" ? textValue() : undefined}>
				{(text) => (
					<TextCol
						text={text()}
						options={{
							include: props.include[props.index],
							maxLines: 2,
						}}
					/>
				)}
			</Match>
			<Match when={fieldData()?.type === "datetime"}>
				<Show when={datetimeField()}>
					{(field) => (
						<DateCol
							date={datetimeValue()}
							includeTime={field().config.time !== false}
							localDateOnly={field().config.time === false}
							fullWithTime={field().config.time !== false}
							options={{ include: props.include[props.index] }}
						/>
					)}
				</Show>
			</Match>
			<Match when={fieldData()?.type === "checkbox"}>
				<PillCol
					text={fieldValue() === true ? T()("yes") : T()("no")}
					theme="primary-opaque"
					options={{ include: props.include[props.index] }}
				/>
			</Match>
			<Match when={fieldData()?.type === "user"}>
				<AuthorCol
					user={fieldRef()}
					options={{ include: props.include[props.index] }}
				/>
			</Match>
		</Switch>
	);
};

export default DocumentDynamicColumns;
