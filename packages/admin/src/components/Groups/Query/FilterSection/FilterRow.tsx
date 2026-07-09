import { FaSolidPlus, FaSolidXmark } from "solid-icons/fa";
import { type Component, createMemo, Match, Switch } from "solid-js";
import { Select } from "@/components/Groups/Form/Select";
import { CommitInput } from "@/components/Groups/Query/FilterSection/CommitInput";
import { EntityValue } from "@/components/Groups/Query/FilterSection/EntityValue";
import Button from "@/components/Partials/Button";
import type { FilterValue } from "@/hooks/useQueryState";
import T from "@/translations";
import {
	type DocumentFilterField,
	type DocumentFilterOperator,
	filterValueInputType,
	isEntityPickerFieldType,
	operatorLabel,
	operatorsForFieldType,
} from "@/utils/document-filter-fields";

export interface FilterRowProps {
	id: string;
	field?: DocumentFilterField;
	operator?: string;
	value: FilterValue;
	fieldOptions: Array<{ value: string; label: string }>;
	onFieldChange: (key: string) => void;
	onOperatorChange: (operator: DocumentFilterOperator) => void;
	onValueCommit: (value: FilterValue) => void;
	onAddRow: () => void;
	canAddRow: boolean;
	addRowDisabledReason?: string;
	onRemove: () => void;
}

const valueToInputString = (value: FilterValue): string => {
	if (value === undefined || typeof value === "boolean") return "";
	if (Array.isArray(value)) return value.join(",");
	return String(value);
};

export const FilterRow: Component<FilterRowProps> = (props) => {
	// ----------------------------------
	// Memos
	const operatorOptions = createMemo(() => {
		const field = props.field;
		if (!field) return [];
		return operatorsForFieldType(field.type).map((operator) => ({
			value: operator,
			label: operatorLabel(operator),
		}));
	});
	const booleanOptions = createMemo(() => [
		{ value: "1", label: props.field?.trueLabel ?? T()("common.yes") },
		{ value: "0", label: props.field?.falseLabel ?? T()("common.no") },
	]);
	const booleanValue = createMemo(() => {
		if (props.value === true) return "1";
		if (props.value === false) return "0";
		return undefined;
	});
	const textInputType = createMemo(() => filterValueInputType(props.field));
	const entityPickerField = createMemo(() => {
		const field = props.field;
		if (!field) return undefined;
		return isEntityPickerFieldType(field.type) ? field : undefined;
	});
	const removeRowTitle = createMemo(() => T()("filter.section.remove.row"));
	const addRowTitle = createMemo(() =>
		props.canAddRow
			? T()("filter.section.add.row")
			: (props.addRowDisabledReason ?? T()("filter.section.add.row")),
	);

	// ----------------------------------
	// Render
	return (
		<div class="w-full flex flex-wrap md:flex-nowrap items-center gap-2.5">
			<div class="w-full md:flex-1 min-w-0">
				<Select
					id={`${props.id}-field`}
					name={`${props.id}-field`}
					value={props.field?.key}
					onChange={(value) => {
						if (value === undefined || value === props.field?.key) return;
						props.onFieldChange(String(value));
					}}
					options={props.fieldOptions}
					ariaLabel={T()("filter.section.where")}
					noClear={true}
					noMargin={true}
					hidePlaceholder={props.field !== undefined}
					renderValue={({ option }) => (
						<span class="truncate" title={option.label}>
							{option.label}
						</span>
					)}
					renderOption={({ option }) => (
						<span class="line-clamp-1 min-w-0 text-left" title={option.label}>
							{option.label}
						</span>
					)}
				/>
			</div>
			<div class="w-[calc(50%-55px)] md:flex-1 min-w-0">
				<Select
					id={`${props.id}-operator`}
					name={`${props.id}-operator`}
					value={props.operator}
					onChange={(value) => {
						if (value === undefined || value === props.operator) return;
						props.onOperatorChange(value as DocumentFilterOperator);
					}}
					options={operatorOptions()}
					ariaLabel={T()("filter.section.operator")}
					disabled={props.field === undefined}
					noClear={true}
					noMargin={true}
				/>
			</div>
			<div class="w-[calc(50%-55px)] md:flex-1 min-w-0">
				<Switch
					fallback={
						<CommitInput
							id={`${props.id}-value`}
							name={`${props.id}-value`}
							type={textInputType()}
							value={valueToInputString(props.value)}
							onCommit={(value) => props.onValueCommit(value)}
							disabled={props.field === undefined}
							placeholder={T()("filter.section.value")}
						/>
					}
				>
					<Match when={props.field?.type === "checkbox"}>
						<Select
							id={`${props.id}-value`}
							name={`${props.id}-value`}
							value={booleanValue()}
							onChange={(value) => {
								props.onValueCommit(
									value === undefined ? undefined : value === "1",
								);
							}}
							options={booleanOptions()}
							ariaLabel={T()("filter.section.value")}
							noMargin={true}
						/>
					</Match>
					<Match when={props.field?.type === "select"}>
						<Select
							id={`${props.id}-value`}
							name={`${props.id}-value`}
							value={valueToInputString(props.value) || undefined}
							onChange={(value) => {
								props.onValueCommit(value === undefined ? "" : String(value));
							}}
							options={props.field?.options ?? []}
							ariaLabel={T()("filter.section.value")}
							noMargin={true}
						/>
					</Match>
					<Match when={entityPickerField()}>
						{(field) => (
							<EntityValue
								id={`${props.id}-value`}
								field={field()}
								value={props.value}
								onCommit={(value) => props.onValueCommit(value)}
							/>
						)}
					</Match>
				</Switch>
			</div>
			<div class="h-10 flex items-center gap-2.5">
				<Button
					theme="border-outline"
					size="icon"
					type="button"
					classes="w-10! h-10! min-w-[40px]!"
					onClick={props.onRemove}
					title={removeRowTitle()}
					aria-label={removeRowTitle()}
				>
					<FaSolidXmark size={14} />
				</Button>
				<Button
					theme="border-outline"
					size="icon"
					type="button"
					classes="w-10! h-10! min-w-[40px]!"
					onClick={props.onAddRow}
					disabled={!props.canAddRow}
					title={addRowTitle()}
					aria-label={addRowTitle()}
				>
					<FaSolidPlus size={14} />
				</Button>
			</div>
		</div>
	);
};
