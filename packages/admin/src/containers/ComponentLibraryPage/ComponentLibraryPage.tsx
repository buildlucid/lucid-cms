import { FaSolidPlus, FaSolidXmark } from "solid-icons/fa";
import { type Component, createSignal, For, type JSXElement } from "solid-js";
import Button, {
	type ButtonShape,
	type ButtonSize,
	type ButtonVariant,
} from "@/components/Button/Button";
import { Checkbox, type CheckboxVariant } from "@/components/Checkbox/Checkbox";
import { Drawer } from "@/components/Drawer/Drawer";
import { DynamicContent } from "@/components/DynamicContent/DynamicContent";
import { Field } from "@/components/Field/Field";
import InfoRow from "@/components/InfoRow/InfoRow";
import { Input, type InputType } from "@/components/Input/Input";
import Link, {
	type LinkShape,
	type LinkSize,
	type LinkVariant,
} from "@/components/Link/Link";
import { Modal, type ModalSize } from "@/components/Modal/Modal";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { Select, type SelectSize } from "@/components/Select/Select";
import {
	SelectMultiple,
	type SelectMultipleOption,
	type SelectMultipleVariant,
} from "@/components/SelectMultiple/SelectMultiple";
import { Switch } from "@/components/Switch/Switch";
import { Textarea } from "@/components/Textarea/Textarea";

/**
 * Keys of a record over each exported union, so adding or removing a value
 * breaks this page until it is shown here.
 */
const valuesOf = <T extends string>(record: Record<T, true>) =>
	Object.keys(record) as T[];

const BUTTON_VARIANTS = valuesOf<ButtonVariant>({
	primary: true,
	secondary: true,
	outline: true,
	"primary-outline": true,
	danger: true,
	"danger-outline": true,
	"background-subtle": true,
	"danger-subtle": true,
	ghost: true,
});
const BUTTON_SIZES = valuesOf<ButtonSize>({
	xs: true,
	sm: true,
	md: true,
	lg: true,
});
const BUTTON_SHAPES = valuesOf<ButtonShape>({
	standard: true,
	square: true,
	circle: true,
});
const LINK_VARIANTS = valuesOf<LinkVariant>({
	primary: true,
	secondary: true,
	outline: true,
	"primary-outline": true,
	danger: true,
	"danger-outline": true,
});
const LINK_SIZES = valuesOf<LinkSize>({
	xs: true,
	sm: true,
	md: true,
	lg: true,
});
const LINK_SHAPES = valuesOf<LinkShape>({
	standard: true,
	square: true,
	circle: true,
});
const CHECKBOX_VARIANTS = valuesOf<CheckboxVariant>({
	default: true,
	button: true,
	"button-primary": true,
	"button-secondary": true,
	"button-danger": true,
});
const SELECT_SIZES = valuesOf<SelectSize>({ sm: true, md: true });
const SELECT_MULTIPLE_VARIANTS = valuesOf<SelectMultipleVariant>({
	default: true,
	list: true,
});
const INPUT_TYPES = valuesOf<InputType>({
	text: true,
	email: true,
	password: true,
	number: true,
	url: true,
	tel: true,
	search: true,
	date: true,
	"datetime-local": true,
	time: true,
	color: true,
});

const selectOptions = [
	{ value: "option1", label: "Option one" },
	{ value: "option2", label: "Option two" },
	{ value: "option3", label: "Option three" },
];
const multipleOptions: SelectMultipleOption[] = [
	{ value: "editor", label: "Editor" },
	{ value: "author", label: "Author" },
	{ value: "admin", label: "Admin" },
];

/** A stacked row of examples with the value each one is showing. */
const Row: Component<{ label: string; children: JSXElement }> = (props) => (
	<div class="flex flex-wrap items-center gap-2">
		<code class="w-44 shrink-0 text-xs text-unfocused">{props.label}</code>
		{props.children}
	</div>
);

const ComponentLibraryPage: Component = () => {
	// ----------------------------------------
	// State
	const [inputValue, setInputValue] = createSignal("Sample text");
	const [textareaValue, setTextareaValue] = createSignal(
		"This is a sample textarea.\n\nIt supports multiple lines.",
	);
	const [switchValue, setSwitchValue] = createSignal(false);
	const [switchLabelLeft, setSwitchLabelLeft] = createSignal(true);
	const [selectValue, setSelectValue] = createSignal<string | undefined>(
		"option1",
	);
	const [selectSearch, setSelectSearch] = createSignal("");
	const [placeholderValue, setPlaceholderValue] = createSignal<
		string | undefined
	>();
	const [multipleValues, setMultipleValues] = createSignal<
		SelectMultipleOption[]
	>([multipleOptions[0] as SelectMultipleOption]);
	const [listValues, setListValues] = createSignal<SelectMultipleOption[]>([]);
	const [checkboxes, setCheckboxes] = createSignal<Record<string, boolean>>({});
	const [fieldValue, setFieldValue] = createSignal("#6633ee");
	const [modalOpen, setModalOpen] = createSignal(false);
	//* the size stays put while the modal animates out, so it cannot resize mid close
	const [modalSize, setModalSize] = createSignal<ModalSize>("md");
	const [confirmOpen, setConfirmOpen] = createSignal(false);
	const [drawerOpen, setDrawerOpen] = createSignal(false);
	const [drawerFull, setDrawerFull] = createSignal(false);
	const [drawerBottom, setDrawerBottom] = createSignal(false);

	// ----------------------------------------
	// Render
	return (
		<PageLayout
			slots={{
				header: (
					<PageHeader
						copy={{
							title: "Components",
							description:
								"Everything exported from @lucidcms/admin/components, with each variant and size it supports.",
						}}
					/>
				),
			}}
		>
			<DynamicContent options={{ padding: "24" }}>
				{/* ---------------------------------------------- Button */}
				<InfoRow.Root
					title={"Button"}
					description={"variant, size, shape, loading"}
				>
					<InfoRow.Content title={"Variants"}>
						<div class="flex flex-col gap-2">
							<For each={BUTTON_VARIANTS}>
								{(variant) => (
									<Row label={`variant="${variant}"`}>
										<Button variant={variant} size="md">
											Button
										</Button>
									</Row>
								)}
							</For>
						</div>
					</InfoRow.Content>
					<InfoRow.Content title={"Sizes"}>
						<div class="flex flex-col gap-2">
							<For each={BUTTON_SIZES}>
								{(size) => (
									<Row label={`size="${size}"`}>
										<Button variant="primary" size={size}>
											Button
										</Button>
									</Row>
								)}
							</For>
						</div>
					</InfoRow.Content>
					<InfoRow.Content title={"Shapes"}>
						<div class="flex flex-col gap-2">
							<For each={BUTTON_SHAPES}>
								{(shape) => (
									<Row label={`shape="${shape}"`}>
										<Button variant="primary" size="md" shape={shape}>
											{shape === "standard" ? "Button" : <FaSolidPlus />}
										</Button>
									</Row>
								)}
							</For>
						</div>
					</InfoRow.Content>
					<InfoRow.Content title={"Loading"}>
						<Row label={"loading"}>
							<Button variant="primary" size="md" loading={true}>
								Saving
							</Button>
						</Row>
					</InfoRow.Content>
				</InfoRow.Root>

				{/* ---------------------------------------------- Checkbox */}
				<InfoRow.Root
					title={"Checkbox"}
					description={"variant, description, errors"}
				>
					<InfoRow.Content title={"Variants"}>
						<div class="flex flex-col gap-2">
							<For each={CHECKBOX_VARIANTS}>
								{(variant) => (
									<Row label={`variant="${variant}"`}>
										<Checkbox
											id={`checkbox-${variant}`}
											name={`checkbox-${variant}`}
											variant={variant}
											label="Delete nested media"
											value={checkboxes()[variant] ?? false}
											onChange={(value) =>
												setCheckboxes((prev) => ({ ...prev, [variant]: value }))
											}
										/>
									</Row>
								)}
							</For>
						</div>
					</InfoRow.Content>
					<InfoRow.Content title={"With description and error"}>
						<Checkbox
							id="checkbox-described"
							name="checkbox-described"
							label="Delete nested media"
							description="Also removes everything inside this folder."
							errors={{ message: "You must confirm this before continuing." }}
							value={checkboxes().described ?? false}
							onChange={(value) =>
								setCheckboxes((prev) => ({ ...prev, described: value }))
							}
						/>
					</InfoRow.Content>
				</InfoRow.Root>

				{/* ---------------------------------------------- Drawer */}
				<InfoRow.Root
					title={"Drawer"}
					description={
						"Root, Header, Title, Description, Body, Footer, Actions"
					}
				>
					<InfoRow.Content title={"Sides and sizes"}>
						<div class="flex flex-wrap gap-2">
							<Button
								variant="outline"
								size="md"
								onClick={() => setDrawerOpen(true)}
							>
								side="right" size="md"
							</Button>
							<Button
								variant="outline"
								size="md"
								onClick={() => setDrawerFull(true)}
							>
								side="right" size="full"
							</Button>
							<Button
								variant="outline"
								size="md"
								onClick={() => setDrawerBottom(true)}
							>
								side="bottom"
							</Button>
						</div>
						<For
							each={
								[
									["right", "md", drawerOpen, setDrawerOpen],
									["right", "full", drawerFull, setDrawerFull],
									["bottom", "md", drawerBottom, setDrawerBottom],
								] as const
							}
						>
							{([side, size, open, setOpen]) => (
								<Drawer.Root
									open={open()}
									onOpenChange={setOpen}
									side={side}
									size={size}
								>
									<Drawer.Header>
										<Drawer.Title>{`${side} / ${size}`}</Drawer.Title>
										<Drawer.Description>
											Every region is a part you compose yourself.
										</Drawer.Description>
									</Drawer.Header>
									<Drawer.Body>
										<Input
											id={`drawer-${side}-${size}-name`}
											name="name"
											type="text"
											label="Name"
											value={inputValue()}
											onChange={setInputValue}
										/>
									</Drawer.Body>
									<Drawer.Footer>
										<Drawer.Actions>
											<Button
												variant="outline"
												size="md"
												onClick={() => setOpen(false)}
											>
												Cancel
											</Button>
											<Button variant="primary" size="md">
												Save
											</Button>
										</Drawer.Actions>
									</Drawer.Footer>
								</Drawer.Root>
							)}
						</For>
					</InfoRow.Content>
				</InfoRow.Root>

				{/* ---------------------------------------------- Field */}
				<InfoRow.Root
					title={"Field"}
					description={
						"Root, Label, Description, Error — for a control we do not ship"
					}
				>
					<InfoRow.Content title={"Wrapping your own control"}>
						<Field.Root id="field-colour" required={true}>
							<Field.Label>Brand colour</Field.Label>
							<input
								id="field-colour"
								type="color"
								value={fieldValue()}
								onInput={(event) => setFieldValue(event.currentTarget.value)}
								class="h-10 w-full rounded-md border border-border bg-input-base"
							/>
							<Field.Error />
							<Field.Description>
								Used across the public site.
							</Field.Description>
						</Field.Root>
					</InfoRow.Content>
				</InfoRow.Root>

				{/* ---------------------------------------------- Input */}
				<InfoRow.Root
					title={"Input"}
					description={"type, label, description, errors"}
				>
					<InfoRow.Content title={"Types"}>
						<div class="flex flex-col gap-3">
							<For each={INPUT_TYPES}>
								{(type) => (
									<Input
										id={`input-${type}`}
										name={`input-${type}`}
										type={type}
										label={`type="${type}"`}
										value={type === "color" ? "#6633ee" : inputValue()}
										onChange={setInputValue}
									/>
								)}
							</For>
						</div>
					</InfoRow.Content>
					<InfoRow.Content title={"With description and error"}>
						<Input
							id="input-described"
							name="input-described"
							type="text"
							label="Slug"
							description="Used in the page URL."
							errors={{ message: "That slug is already taken." }}
							value={inputValue()}
							onChange={setInputValue}
						/>
					</InfoRow.Content>
				</InfoRow.Root>

				{/* ---------------------------------------------- Link */}
				<InfoRow.Root
					title={"Link"}
					description={
						"variant, size, shape — a router anchor styled as a button"
					}
				>
					<InfoRow.Content title={"Variants"}>
						<div class="flex flex-col gap-2">
							<For each={LINK_VARIANTS}>
								{(variant) => (
									<Row label={`variant="${variant}"`}>
										<Link href="#" variant={variant} size="md">
											Link
										</Link>
									</Row>
								)}
							</For>
						</div>
					</InfoRow.Content>
					<InfoRow.Content title={"Sizes"}>
						<div class="flex flex-col gap-2">
							<For each={LINK_SIZES}>
								{(size) => (
									<Row label={`size="${size}"`}>
										<Link href="#" variant="primary" size={size}>
											Link
										</Link>
									</Row>
								)}
							</For>
						</div>
					</InfoRow.Content>
					<InfoRow.Content title={"Shapes"}>
						<div class="flex flex-col gap-2">
							<For each={LINK_SHAPES}>
								{(shape) => (
									<Row label={`shape="${shape}"`}>
										<Link href="#" variant="primary" size="md" shape={shape}>
											{shape === "standard" ? "Link" : <FaSolidXmark />}
										</Link>
									</Row>
								)}
							</For>
						</div>
					</InfoRow.Content>
				</InfoRow.Root>

				{/* ---------------------------------------------- Modal */}
				<InfoRow.Root
					title={"Modal"}
					description={
						"Root, Header, Title, Description, Body, Footer, Actions, Confirm"
					}
				>
					<InfoRow.Content title={"Sizes"}>
						<div class="flex flex-wrap gap-2">
							<For each={["sm", "md", "lg"] as const}>
								{(size) => (
									<Button
										variant="outline"
										size="md"
										onClick={() => {
											setModalSize(size);
											setModalOpen(true);
										}}
									>
										size="{size}"
									</Button>
								)}
							</For>
						</div>
						<Modal.Root
							open={modalOpen()}
							onOpenChange={setModalOpen}
							size={modalSize()}
						>
							<Modal.Header>
								<Modal.Title>{`size="${modalSize()}"`}</Modal.Title>
								<Modal.Description>
									Every region is a part you compose yourself.
								</Modal.Description>
							</Modal.Header>
							<Modal.Body>
								<Textarea
									id="modal-notes"
									name="notes"
									label="Notes"
									value={textareaValue()}
									onChange={setTextareaValue}
									rows={3}
								/>
							</Modal.Body>
							<Modal.Footer>
								<Modal.Actions>
									<Button
										variant="outline"
										size="md"
										onClick={() => setModalOpen(false)}
									>
										Cancel
									</Button>
									<Button variant="primary" size="md">
										Save
									</Button>
								</Modal.Actions>
							</Modal.Footer>
						</Modal.Root>
					</InfoRow.Content>
					<InfoRow.Content title={"Confirm"}>
						<Button
							variant="danger"
							size="md"
							onClick={() => setConfirmOpen(true)}
						>
							Delete page
						</Button>
						<Modal.Confirm
							open={confirmOpen()}
							onOpenChange={setConfirmOpen}
							title="Delete this page?"
							description="This cannot be undone."
							confirmLabel="Delete"
							onConfirm={() => setConfirmOpen(false)}
						/>
					</InfoRow.Content>
				</InfoRow.Root>

				{/* ---------------------------------------------- Select */}
				<InfoRow.Root
					title={"Select"}
					description={"size, clearable, search, placeholder"}
				>
					<InfoRow.Content title={"Sizes"}>
						<div class="flex flex-col gap-3">
							<For each={SELECT_SIZES}>
								{(size) => (
									<Select
										id={`select-${size}`}
										name={`select-${size}`}
										size={size}
										label={`size="${size}"`}
										value={selectValue()}
										onChange={setSelectValue}
										options={selectOptions}
									/>
								)}
							</For>
						</div>
					</InfoRow.Content>
					<InfoRow.Content title={"Clearable, searchable, custom placeholder"}>
						<div class="flex flex-col gap-3">
							<Select
								id="select-clearable"
								name="select-clearable"
								label="clearable"
								clearable={true}
								value={selectValue()}
								onChange={setSelectValue}
								options={selectOptions}
							/>
							<Select
								id="select-search"
								name="select-search"
								label="search"
								value={selectValue()}
								onChange={setSelectValue}
								options={selectOptions}
								search={{
									value: selectSearch(),
									onChange: setSelectSearch,
								}}
							/>
							<Select
								id="select-placeholder"
								name="select-placeholder"
								label={'placeholder="Pick a status"'}
								placeholder="Pick a status"
								value={placeholderValue()}
								onChange={setPlaceholderValue}
								options={selectOptions}
							/>
						</div>
					</InfoRow.Content>
				</InfoRow.Root>

				{/* ---------------------------------------------- SelectMultiple */}
				<InfoRow.Root title={"SelectMultiple"} description={"variant"}>
					<InfoRow.Content title={"Variants"}>
						<div class="flex flex-col gap-3">
							<For each={SELECT_MULTIPLE_VARIANTS}>
								{(variant) => (
									<SelectMultiple
										id={`select-multiple-${variant}`}
										name={`select-multiple-${variant}`}
										variant={variant}
										label={`variant="${variant}"`}
										placeholder="Choose roles"
										values={
											variant === "list" ? listValues() : multipleValues()
										}
										onChange={
											variant === "list" ? setListValues : setMultipleValues
										}
										options={multipleOptions}
									/>
								)}
							</For>
						</div>
					</InfoRow.Content>
				</InfoRow.Root>

				{/* ---------------------------------------------- Switch */}
				<InfoRow.Root
					title={"Switch"}
					description={"trueLabel, falseLabel, labelLeft"}
				>
					<InfoRow.Content title={"Default"}>
						<Switch
							id="switch-default"
							name="switch-default"
							label="Published"
							value={switchValue()}
							onChange={setSwitchValue}
						/>
					</InfoRow.Content>
					<InfoRow.Content title={"Custom state wording"}>
						<Switch
							id="switch-states"
							name="switch-states"
							label="Visibility"
							trueLabel="Live"
							falseLabel="Draft"
							value={switchValue()}
							onChange={setSwitchValue}
						/>
					</InfoRow.Content>
					<InfoRow.Content title={"labelLeft"}>
						<Switch
							id="switch-label-left"
							name="switch-label-left"
							label="Send notifications"
							labelLeft={true}
							value={switchLabelLeft()}
							onChange={setSwitchLabelLeft}
						/>
					</InfoRow.Content>
				</InfoRow.Root>

				{/* ---------------------------------------------- Textarea */}
				<InfoRow.Root
					title={"Textarea"}
					description={"label, description, errors, rows"}
				>
					<InfoRow.Content title={"Default"}>
						<Textarea
							id="textarea-default"
							name="textarea-default"
							label="Summary"
							value={textareaValue()}
							onChange={setTextareaValue}
						/>
					</InfoRow.Content>
					<InfoRow.Content title={"With description and error"}>
						<Textarea
							id="textarea-described"
							name="textarea-described"
							label="Summary"
							description="Shown in listings and search results."
							errors={{ message: "Keep this under 160 characters." }}
							rows={3}
							value={textareaValue()}
							onChange={setTextareaValue}
						/>
					</InfoRow.Content>
				</InfoRow.Root>
			</DynamicContent>
		</PageLayout>
	);
};

export default ComponentLibraryPage;
