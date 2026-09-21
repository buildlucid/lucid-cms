import type { RichTextJSON } from "@lucidcms/rich-text";
import { FaSolidPlus, FaSolidXmark } from "solid-icons/fa";
import { type Component, createSignal, For, type JSXElement } from "solid-js";
import Alert, {
	type AlertAppearance,
	type AlertVariant,
} from "@/components/Alert/Alert";
import Button, {
	type ButtonShape,
	type ButtonSize,
	type ButtonVariant,
} from "@/components/Button/Button";
import Checkbox, { type CheckboxVariant } from "@/components/Checkbox/Checkbox";
import CodeEditor from "@/components/CodeEditor/CodeEditor";
import ColorPicker from "@/components/ColorPicker/ColorPicker";
import Drawer from "@/components/Drawer/Drawer";
import EmptyState from "@/components/EmptyState/EmptyState";
import ErrorState from "@/components/ErrorState/ErrorState";
import Field from "@/components/Field/Field";
import InfoRow from "@/components/InfoRow/InfoRow";
import Input, { type InputType } from "@/components/Input/Input";
import Link, {
	type LinkShape,
	type LinkSize,
	type LinkVariant,
} from "@/components/Link/Link";
import Modal, { type ModalSize } from "@/components/Modal/Modal";
import PageLayout from "@/components/PageLayout/PageLayout";
import Pill, { type PillSize, type PillVariant } from "@/components/Pill/Pill";
import ProgressBar, {
	type ProgressBarSize,
	type ProgressBarVariant,
} from "@/components/ProgressBar/ProgressBar";
import RichText from "@/components/RichText/RichText";
import SectionHeading from "@/components/SectionHeading/SectionHeading";
import Select, { type SelectSize } from "@/components/Select/Select";
import SelectMultiple, {
	type SelectMultipleOption,
	type SelectMultipleVariant,
} from "@/components/SelectMultiple/SelectMultiple";
import Slider from "@/components/Slider/Slider";
import Spinner, { type SpinnerSize } from "@/components/Spinner/Spinner";
import Switch from "@/components/Switch/Switch";
import Textarea from "@/components/Textarea/Textarea";

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
const ALERT_VARIANTS = valuesOf<AlertVariant>({
	info: true,
	success: true,
	warning: true,
	error: true,
});
const ALERT_APPEARANCES = valuesOf<AlertAppearance>({
	block: true,
	bar: true,
	pill: true,
});
const PILL_VARIANTS = valuesOf<PillVariant>({
	primary: true,
	"primary-subtle": true,
	secondary: true,
	danger: true,
	"danger-subtle": true,
	"warning-subtle": true,
	"info-subtle": true,
	neutral: true,
	outline: true,
	"workflow-yellow": true,
	"workflow-green": true,
	"workflow-blue": true,
	"workflow-purple": true,
});
const PILL_SIZES = valuesOf<PillSize>({ xs: true, sm: true });
const PROGRESS_BAR_VARIANTS = valuesOf<ProgressBarVariant>({
	primary: true,
	"primary-subtle": true,
	secondary: true,
	danger: true,
	"danger-subtle": true,
	"warning-subtle": true,
	neutral: true,
});
const PROGRESS_BAR_SIZES = valuesOf<ProgressBarSize>({
	sm: true,
	md: true,
	lg: true,
});
const SPINNER_SIZES = valuesOf<SpinnerSize>({ sm: true, md: true, lg: true });
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
	const [colorValue, setColorValue] = createSignal("#2563eb");
	const [sliderValue, setSliderValue] = createSignal([40]);
	const [sliderRange, setSliderRange] = createSignal([20, 80]);
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
	const [jsonValue, setJsonValue] = createSignal('{\n\t"featured": true\n}');
	const [codeValue, setCodeValue] = createSignal("<h1>Hello</h1>");
	const [codeLanguage, setCodeLanguage] = createSignal("html");
	const [richTextValue, setRichTextValue] = createSignal<RichTextJSON>({
		type: "doc",
		content: [{ type: "paragraph" }],
	});
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
		<PageLayout.Root>
			<PageLayout.Header
				title={"Components"}
				description={
					"Everything exported from @lucidcms/admin/components, with each variant and size it supports."
				}
			/>
			<PageLayout.Body>
				<div class="flex-1 h-full p-4 md:p-6">
					{/* ---------------------------------------------- Alert */}
					<InfoRow.Root title={"Alert"} description={"variant, appearance"}>
						<InfoRow.Content title={"Variants"}>
							<div class="flex flex-col gap-2">
								<For each={ALERT_VARIANTS}>
									{(variant) => (
										<Alert variant={variant}>
											{`This is a ${variant} message.`}
										</Alert>
									)}
								</For>
							</div>
						</InfoRow.Content>
						<InfoRow.Content title={"Appearances"}>
							<div class="flex flex-col items-start gap-2">
								<For each={ALERT_APPEARANCES}>
									{(appearance) => (
										<Alert variant="warning" appearance={appearance}>
											{`appearance="${appearance}"`}
										</Alert>
									)}
								</For>
							</div>
						</InfoRow.Content>
					</InfoRow.Root>

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
													setCheckboxes((prev) => ({
														...prev,
														[variant]: value,
													}))
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

					{/* ---------------------------------------------- CodeEditor */}
					<InfoRow.Root
						title={"CodeEditor"}
						description={"language, languages, lint, format"}
					>
						<InfoRow.Content title={"Single language, linted and formatted"}>
							<CodeEditor
								id="code-json"
								name="code-json"
								label="Payload"
								description="Reformats when it loses focus, and flags syntax errors."
								language="json"
								lint
								format
								value={jsonValue()}
								onChange={setJsonValue}
							/>
						</InfoRow.Content>
						<InfoRow.Content title={"With a language switcher"}>
							<CodeEditor
								id="code-multi"
								name="code-multi"
								label="Snippet"
								language={codeLanguage()}
								languages={["html", "css", "javascript", "json", "markdown"]}
								onLanguageChange={setCodeLanguage}
								value={codeValue()}
								onChange={setCodeValue}
							/>
						</InfoRow.Content>
					</InfoRow.Root>

					{/* ---------------------------------------------- ColorPicker */}
					<InfoRow.Root
						title={"ColorPicker"}
						description={"presets, description, errors"}
					>
						<InfoRow.Content title={"Default"}>
							<ColorPicker
								id="color-default"
								name="color-default"
								label="Brand colour"
								value={colorValue()}
								onChange={setColorValue}
							/>
						</InfoRow.Content>
						<InfoRow.Content title={"With presets"}>
							<ColorPicker
								id="color-presets"
								name="color-presets"
								label="Brand colour"
								description="The swatch opens your browser's colour picker."
								presets={[
									"#0f172a",
									"#2563eb",
									"#16a34a",
									"#f59e0b",
									"#dc2626",
								]}
								value={colorValue()}
								onChange={setColorValue}
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

					{/* ---------------------------------------------- EmptyState */}
					<InfoRow.Root
						title={"EmptyState"}
						description={"title, description, actions"}
					>
						<InfoRow.Content title={"Default"}>
							<EmptyState />
						</InfoRow.Content>
						<InfoRow.Content title={"With an action"}>
							<EmptyState
								title="No reports yet"
								description="Reports appear here once a run finishes."
								actions={
									<Button size="sm" onClick={() => undefined}>
										Run now
									</Button>
								}
							/>
						</InfoRow.Content>
					</InfoRow.Root>

					{/* ---------------------------------------------- ErrorState */}
					<InfoRow.Root
						title={"ErrorState"}
						description={"image, title, description, actions"}
					>
						<InfoRow.Content title={"Default"}>
							<ErrorState />
						</InfoRow.Content>
						<InfoRow.Content title={"With a way out"}>
							<ErrorState
								title="Report unavailable"
								description="This report has been deleted."
								actions={
									<Link variant="primary" size="sm" href="/lucid">
										Back to dashboard
									</Link>
								}
							/>
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

					{/* ---------------------------------------------- InfoRow */}
					<InfoRow.Root
						title={"InfoRow"}
						description={"Root, Content, align, actions"}
					>
						<InfoRow.Content title={"A row of cards"}>
							<p class="text-sm">
								Every row on this page is an InfoRow.Root with one
								InfoRow.Content per card.
							</p>
						</InfoRow.Content>
						<InfoRow.Content
							title={"With actions"}
							description={"align controls where they sit against the title."}
							align="center"
							actions={
								<Button variant="outline" size="sm">
									Change
								</Button>
							}
						/>
					</InfoRow.Root>

					{/* ---------------------------------------------- PageLayout */}
					<InfoRow.Root title={"PageLayout"} description={"Root, Header, Body"}>
						<InfoRow.Content title={"A page"}>
							<p class="mb-3 text-sm">
								Root stacks whatever you give it. Anything before the header is
								a top bar, anything after the body is pinned beneath it, and
								Body is the part that grows.
							</p>
							<div class="overflow-hidden rounded-md border border-border">
								<PageLayout.Header
									title="Reports"
									description="Everything the crawler has found."
									actions={
										<Button variant="primary" size="sm">
											Run now
										</Button>
									}
								/>
								<div class="bg-background-base p-4 text-sm">Body</div>
							</div>
						</InfoRow.Content>
						<InfoRow.Content title={"A header with a second row"}>
							<div class="overflow-hidden rounded-md border border-border">
								<PageLayout.Header title="Settings">
									<div class="px-4 pb-4 md:px-6">
										<Pill variant="primary-subtle">Tabs go here</Pill>
									</div>
								</PageLayout.Header>
							</div>
						</InfoRow.Content>
					</InfoRow.Root>

					{/* ---------------------------------------------- Pill */}
					<InfoRow.Root
						title={"Pill"}
						description={"variant, size, as, tooltip"}
					>
						<InfoRow.Content title={"Variants"}>
							<div class="flex flex-wrap items-center gap-2">
								<For each={PILL_VARIANTS}>
									{(variant) => <Pill variant={variant}>{variant}</Pill>}
								</For>
							</div>
						</InfoRow.Content>
						<InfoRow.Content title={"Sizes"}>
							<div class="flex flex-wrap items-center gap-2">
								<For each={PILL_SIZES}>
									{(size) => (
										<Pill variant="primary-subtle" size={size}>
											{`size="${size}"`}
										</Pill>
									)}
								</For>
							</div>
						</InfoRow.Content>
						<InfoRow.Content title={"As a button"}>
							<Pill as="button" variant="outline" tooltip="Clears the filter">
								Clear filter
							</Pill>
						</InfoRow.Content>
					</InfoRow.Root>

					{/* ---------------------------------------------- ProgressBar */}
					<InfoRow.Root
						title={"ProgressBar"}
						description={"variant, size, square, labels"}
					>
						<InfoRow.Content title={"Variants"}>
							<div class="flex flex-col gap-4">
								<For each={PROGRESS_BAR_VARIANTS}>
									{(variant) => (
										<div>
											<code class="text-xs text-unfocused">{`variant="${variant}"`}</code>
											<ProgressBar
												class="mt-1"
												variant={variant}
												progress={95}
											/>
										</div>
									)}
								</For>
							</div>
						</InfoRow.Content>
						<InfoRow.Content title={"Sizes"}>
							<div class="flex flex-col gap-4">
								<For each={PROGRESS_BAR_SIZES}>
									{(size) => (
										<div>
											<code class="text-xs text-unfocused">{`size="${size}"`}</code>
											<ProgressBar class="mt-1" size={size} progress={60} />
										</div>
									)}
								</For>
							</div>
						</InfoRow.Content>
						<InfoRow.Content title={"Square corners"}>
							<div class="overflow-hidden rounded-md border border-border">
								<div class="bg-card-base p-4 text-sm">
									Sits flush against the edge of a card.
								</div>
								<ProgressBar progress={40} size="md" square />
							</div>
						</InfoRow.Content>
						<InfoRow.Content title={"Reacting to the value"}>
							<p class="mb-3 text-sm">
								The bar has no thresholds of its own, so switch the variant
								where you know what the number means. Drag to pass 90%.
							</p>
							<Slider
								id="progress-demo"
								name="progress-demo"
								value={sliderValue()}
								onChange={setSliderValue}
								min={0}
								max={100}
								step={1}
							/>
							<ProgressBar
								class="mt-3"
								progress={sliderValue()[0] ?? 0}
								variant={(sliderValue()[0] ?? 0) > 90 ? "danger" : "neutral"}
								labels={{ start: `${sliderValue()[0] ?? 0}% used` }}
							/>
						</InfoRow.Content>
					</InfoRow.Root>

					{/* ---------------------------------------------- RichText */}
					<InfoRow.Root
						title={"RichText"}
						description={"every control is on unless you turn it off"}
					>
						<InfoRow.Content title={"Full toolbar"}>
							<RichText
								id="rich-text"
								name="rich-text"
								label="Body"
								placeholder="Start writing..."
								value={richTextValue()}
								onChange={setRichTextValue}
							/>
						</InfoRow.Content>
						<InfoRow.Content title={"No controls at all"}>
							<RichText
								id="rich-text-bare"
								name="rich-text-bare"
								label="Plain text"
								placeholder="No toolbar, and no selection pill either..."
								headings={false}
								bold={false}
								italic={false}
								underline={false}
								strikethrough={false}
								bulletList={false}
								orderedList={false}
								clearFormatting={false}
								links={false}
								value={richTextValue()}
								onChange={setRichTextValue}
							/>
						</InfoRow.Content>
						<InfoRow.Content title={"Trimmed down, as a comment box"}>
							<RichText
								id="rich-text-comment"
								name="rich-text-comment"
								label="Comment"
								placeholder="Leave a comment..."
								description="Headings, underline and strikethrough turned off."
								headings={false}
								underline={false}
								strikethrough={false}
								value={richTextValue()}
								onChange={setRichTextValue}
							/>
						</InfoRow.Content>
					</InfoRow.Root>

					{/* ---------------------------------------------- SectionHeading */}
					<InfoRow.Root
						title={"SectionHeading"}
						description={"title, description, level, actions"}
					>
						<InfoRow.Content title={"Default"}>
							<SectionHeading
								title="Access"
								description="Who can open this document."
							/>
						</InfoRow.Content>
						<InfoRow.Content title={"With actions"}>
							<SectionHeading
								title="Members"
								level={3}
								actions={
									<Button variant="outline" size="sm">
										Invite
									</Button>
								}
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
						<InfoRow.Content
							title={"Clearable, searchable, custom placeholder"}
						>
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

					{/* ---------------------------------------------- Slider */}
					<InfoRow.Root
						title={"Slider"}
						description={"min, max, step, thumbs, description, errors"}
					>
						<InfoRow.Content title={"Default"}>
							<Slider
								id="slider-default"
								name="slider-default"
								label="Quality"
								value={sliderValue()}
								onChange={setSliderValue}
								min={0}
								max={100}
								step={5}
							/>
						</InfoRow.Content>
						<InfoRow.Content title={"Two thumbs"}>
							<Slider
								id="slider-range"
								name="slider-range"
								label="Price range"
								description="Drag either end, or type a value."
								value={sliderRange()}
								onChange={setSliderRange}
								min={0}
								max={100}
								step={10}
								thumbs={2}
							/>
						</InfoRow.Content>
					</InfoRow.Root>

					{/* ---------------------------------------------- Spinner */}
					<InfoRow.Root title={"Spinner"} description={"size"}>
						<InfoRow.Content title={"Sizes"}>
							<div class="flex flex-wrap items-center gap-4">
								<For each={SPINNER_SIZES}>
									{(size) => (
										<Row label={`size="${size}"`}>
											<Spinner size={size} />
										</Row>
									)}
								</For>
							</div>
						</InfoRow.Content>
					</InfoRow.Root>

					{/* ---------------------------------------------- Switch */}
					<InfoRow.Root title={"Switch"} description={"trueLabel, falseLabel"}>
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
				</div>
			</PageLayout.Body>
		</PageLayout.Root>
	);
};

export default ComponentLibraryPage;
