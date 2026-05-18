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
import DateCol from "./DateCol";
import PillCol from "./PillCol";
import TextCol from "./TextCol";
import UserStackCol from "./UserStackCol";

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
	const userFieldRefs = createMemo(() => {
		if (props.field.type !== "user") return null;

		const relationValues = fieldValue();
		const values = Array.isArray(relationValues)
			? relationValues.filter(
					(value): value is number => typeof value === "number",
				)
			: typeof relationValues === "number"
				? [relationValues]
				: [];
		if (values.length === 0) return [];

		const refs = props.document.refs?.user;
		if (!refs) return [];

		return values
			.map((value) =>
				refs.find(
					(ref): ref is NonNullable<UserRef> =>
						ref !== null &&
						ref !== undefined &&
						"username" in ref &&
						"email" in ref &&
						"firstName" in ref &&
						"lastName" in ref &&
						"profilePicture" in ref &&
						ref.id === value,
				),
			)
			.filter(
				(ref): ref is NonNullable<UserRef> =>
					ref !== null &&
					ref !== undefined &&
					"username" in ref &&
					"email" in ref &&
					"firstName" in ref &&
					"lastName" in ref &&
					"profilePicture" in ref,
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
				<UserStackCol
					users={userFieldRefs() ?? []}
					options={{ include: props.include[props.index], minWidth: 200 }}
				/>
			</Match>
		</Switch>
	);
};

export default DocumentDynamicColumns;
