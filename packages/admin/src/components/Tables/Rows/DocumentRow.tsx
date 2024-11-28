import T from "@/translations";
import { type Component, For, Switch, Match, createMemo } from "solid-js";
import type { TableRowProps } from "@/types/components";
import type {
	CollectionDocumentResponse,
	CollectionResponse,
	CFConfig,
	UserResMeta,
	FieldTypes,
} from "@types";
import type { ActionDropdownProps } from "@/components/Partials/ActionDropdown";
import brickHelpers from "@/utils/brick-helpers";
import contentLocaleStore from "@/store/contentLocaleStore";
import { Tr } from "@/components/Groups/Table";
import DateCol from "@/components/Tables/Columns/DateCol";
import AuthorCol from "@/components/Tables/Columns/AuthorCol";
import TextCol from "@/components/Tables/Columns/TextCol";
import PillCol from "../Columns/PillCol";

interface DocumentRowProps extends TableRowProps {
	document: CollectionDocumentResponse;
	collection: CollectionResponse;
	fieldInclude: CFConfig<FieldTypes>[];
	include: boolean[];
	actions?: ActionDropdownProps["actions"];
	contentLocale?: string;
	callbacks?: {
		setSelected?: (i: number) => void;
		onClick?: () => void;
	};
	current?: boolean;
}

const DocumentRow: Component<DocumentRowProps> = (props) => {
	// ----------------------------------
	// Memos
	const isPublished = createMemo(() => {
		if (props.document.status === "published") return true;
		if (props.collection.config.useDrafts) {
			return typeof props.document.version?.published?.id === "number";
		}
		return true; // if not using drafts and a row exists, it is published
	});

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
		>
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
			<PillCol
				text={isPublished() ? T()("published") : T()("draft")}
				theme={isPublished() ? "primary" : "grey"}
				options={{ include: props?.include[props.fieldInclude.length] }}
			/>
			<DateCol
				date={props.document.updatedAt}
				options={{ include: props?.include[props.fieldInclude.length] }}
			/>
		</Tr>
	);
};

const DocumentDynamicColumns: Component<{
	field: CFConfig<Exclude<FieldTypes, "repeater" | "tab">>;
	document: CollectionDocumentResponse;
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
	const fieldMeta = createMemo(() => {
		return brickHelpers.getFieldMeta({
			fieldData: fieldData(),
			fieldConfig: props.field,
			contentLocale: contentLocale(),
			collectionTranslations: props.collectionTranslations,
		});
	});

	// ----------------------------------
	// Render
	return (
		<Switch
			fallback={
				<TextCol
					text={"~"}
					options={{ include: props?.include[props.index] }}
				/>
			}
		>
			<Match when={fieldData()?.type === "text"}>
				<TextCol
					text={fieldValue() as string | undefined | null}
					options={{ include: props?.include[props.index] }}
				/>
			</Match>
			<Match when={fieldData()?.type === "textarea"}>
				<TextCol
					text={fieldValue() as string | undefined | null}
					options={{
						include: props?.include[props.index],
						maxLines: 2,
					}}
				/>
			</Match>
			<Match when={fieldData()?.type === "checkbox"}>
				<PillCol
					text={
						(fieldValue() as 1 | 0 | undefined | null) === 1
							? T()("yes")
							: T()("no")
					}
					theme="primary"
					options={{ include: props?.include[props.index] }}
				/>
			</Match>
			<Match when={fieldData()?.type === "user"}>
				<AuthorCol
					user={fieldMeta() as UserResMeta}
					options={{ include: props?.include[props.index] }}
				/>
			</Match>
		</Switch>
	);
};

export default DocumentRow;
