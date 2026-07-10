import type {
	Collection,
	DocumentRef,
	InternalCollectionDocument,
	RelationFieldValue,
	UserRef,
} from "@types";
import { type Component, createMemo, Match, Show, Switch } from "solid-js";
import contentLocaleStore from "@/store/contentLocaleStore";
import T from "@/translations";
import type { CollectionLeafFieldConfig } from "@/types/collection-config";
import brickHelpers from "@/utils/brick-helpers";
import {
	formatDocumentFieldValue,
	getDocumentPreviewLabel,
} from "@/utils/document-table-helpers";
import { isDocumentRef, isUserRef } from "@/utils/relation-field-helpers";
import ColorCol from "./ColorCol";
import DateCol from "./DateCol";
import PillCol from "./PillCol";
import TextCol from "./TextCol";
import UserStackCol from "./UserStackCol";

const DocumentDynamicColumns: Component<{
	field: CollectionLeafFieldConfig;
	document: InternalCollectionDocument;
	include: boolean[];
	index: number;
	collectionLocalized: boolean;
	collectionsByKey?: Map<string, Collection>;
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
			collectionLocalized: props.collectionLocalized,
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
	const selectValue = createMemo(() => {
		if (props.field.type !== "select") return null;

		return formatDocumentFieldValue({
			fieldConfig: props.field,
			fieldData: fieldData(),
			contentLocale: contentLocale(),
			collectionLocalized: props.collectionLocalized,
		});
	});
	const rangeValue = createMemo(() => {
		if (props.field.type !== "range") return null;

		return formatDocumentFieldValue({
			fieldConfig: props.field,
			fieldData: fieldData(),
			contentLocale: contentLocale(),
			collectionLocalized: props.collectionLocalized,
		});
	});
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
				refs.find((ref): ref is NonNullable<UserRef> => {
					return isUserRef(ref) && ref.id === value;
				}),
			)
			.filter(isUserRef);
	});
	const relationFieldValues = createMemo(() => {
		if (props.field.type !== "relation") return null;

		const value = fieldValue();
		return Array.isArray(value)
			? value.filter(
					(item): item is RelationFieldValue =>
						typeof item === "object" &&
						item !== null &&
						"id" in item &&
						"collectionKey" in item &&
						typeof item.id === "number" &&
						typeof item.collectionKey === "string",
				)
			: [];
	});
	const relationFieldRefs = createMemo(() => {
		const values = relationFieldValues();
		if (!values?.length) return [];

		const refs = props.document.refs?.relation;
		if (!refs) return [];

		return values
			.map((value) =>
				refs.find((ref): ref is DocumentRef => {
					return (
						isDocumentRef(ref) &&
						ref.id === value.id &&
						ref.collectionKey === value.collectionKey
					);
				}),
			)
			.filter(isDocumentRef);
	});
	const relationLabels = createMemo(() => {
		const values = relationFieldValues();
		if (!values?.length) return null;
		const refs = relationFieldRefs();

		return values
			.map((value) => {
				const ref = refs.find(
					(ref) =>
						ref.id === value.id && ref.collectionKey === value.collectionKey,
				);
				return getDocumentPreviewLabel({
					collection: props.collectionsByKey?.get(value.collectionKey),
					document:
						ref ??
						({
							id: value.id,
							collectionKey: value.collectionKey,
							fields: null,
						} satisfies DocumentRef),
					contentLocale: contentLocale(),
				});
			})
			.join(", ");
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
							includeTime={field().time !== false}
							localDateOnly={field().time === false}
							fullWithTime={field().time !== false}
							options={{ include: props.include[props.index] }}
						/>
					)}
				</Show>
			</Match>
			<Match when={fieldData()?.type === "checkbox"}>
				<PillCol
					text={fieldValue() === true ? T()("common.yes") : T()("common.no")}
					theme="primary-opaque"
					options={{ include: props.include[props.index] }}
				/>
			</Match>
			<Match when={fieldData()?.type === "select" ? selectValue() : undefined}>
				{(text) => (
					<TextCol
						text={text()}
						options={{ include: props.include[props.index] }}
					/>
				)}
			</Match>
			<Match when={fieldData()?.type === "range" ? rangeValue() : undefined}>
				{(text) => (
					<TextCol
						text={text()}
						options={{ include: props.include[props.index] }}
					/>
				)}
			</Match>
			<Match when={fieldData()?.type === "user"}>
				<UserStackCol
					users={userFieldRefs() ?? []}
					options={{ include: props.include[props.index], minWidth: 200 }}
				/>
			</Match>
			<Match when={fieldData()?.type === "relation" ? relationLabels() : null}>
				{(text) => (
					<TextCol
						text={text()}
						options={{
							include: props.include[props.index],
							maxLines: 2,
							minWidth: 220,
						}}
					/>
				)}
			</Match>
			<Match when={fieldData()?.type === "color" ? textValue() : undefined}>
				{(value) => (
					<ColorCol
						value={value()}
						options={{ include: props.include[props.index], minWidth: 160 }}
					/>
				)}
			</Match>
		</Switch>
	);
};

export default DocumentDynamicColumns;
