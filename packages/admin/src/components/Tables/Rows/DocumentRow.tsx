import type {
	CFConfig,
	Collection,
	FieldTypes,
	InternalCollectionDocument,
	UserRef,
} from "@types";
import { type Component, createMemo, For, Match, Show, Switch } from "solid-js";
import { Tr } from "@/components/Groups/Table";
import type { TableTheme } from "@/components/Groups/Table/Table";
import type { ActionDropdownProps } from "@/components/Partials/ActionDropdown";
import AuthorCol from "@/components/Tables/Columns/AuthorCol";
import DateCol from "@/components/Tables/Columns/DateCol";
import SelectCol from "@/components/Tables/Columns/SelectCol";
import TextCol from "@/components/Tables/Columns/TextCol";
import contentLocaleStore from "@/store/contentLocaleStore";
import T from "@/translations";
import type { TableRowProps } from "@/types/components";
import brickHelpers from "@/utils/brick-helpers";
import PillCol from "../Columns/PillCol";

interface DocumentRowProps extends TableRowProps {
	document: InternalCollectionDocument;
	collection: Collection;
	fieldInclude: CFConfig<FieldTypes>[];
	include: boolean[];
	actions?: ActionDropdownProps["actions"];
	contentLocale?: string;
	callbacks?: {
		setSelected?: (i: number) => void;
		onClick?: () => void;
	};
	selection?: {
		selected: boolean;
		onChange: () => void;
	};
	current?: boolean;
	theme?: TableTheme;
}

const DocumentRow: Component<DocumentRowProps> = (props) => {
	// ----------------------------------
	// Render
	return (
		<Tr
			index={props.index}
			selected={props.selected}
			options={props.options}
			callbacks={props.callbacks}
			actions={props.actions}
			onClick={props.callbacks?.onClick}
			current={props.current}
			theme={props.theme}
		>
			<Show when={props.selection}>
				{(selection) => (
					<SelectCol
						type="td"
						value={selection().selected}
						onChange={selection().onChange}
						theme={props.theme}
						padding={props.options?.padding}
					/>
				)}
			</Show>
			<For each={props.fieldInclude}>
				{(field, i) => {
					if (field.type === "tab") return null;
					if (field.type === "repeater") return null;

					return (
						<DocumentDynamicColumns
							field={field}
							document={props.document}
							include={props.include}
							index={i()}
							collectionTranslations={props.collection.config.useTranslations}
						/>
					);
				}}
			</For>
			<DateCol
				date={props.document.updatedAt}
				options={{ include: props?.include[props.fieldInclude.length] }}
			/>
		</Tr>
	);
};

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
							includeTime={field().config.useTime !== false}
							localDateOnly={field().config.useTime === false}
							fullWithTime={field().config.useTime !== false}
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

export default DocumentRow;
