import { FaSolidXmark } from "solid-icons/fa";
import type { Component } from "solid-js";
import { createSignal } from "solid-js";
import Button from "@/components/Button/Button";
import { Checkbox } from "@/components/Checkbox/Checkbox";
import { ColorInput } from "@/components/ColorInput/ColorInput";
import { DynamicContent } from "@/components/DynamicContent/DynamicContent";
import InfoRow from "@/components/InfoRow/InfoRow";
import { Input } from "@/components/Input/Input";
import { InsetLabelInput } from "@/components/InsetLabelInput/InsetLabelInput";
import { JSONTextarea } from "@/components/JSONTextarea/JSONTextarea";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import { RichText } from "@/components/RichText/RichText";
import { SearchInput } from "@/components/SearchInput/SearchInput";
import { Select } from "@/components/Select/Select";
import { SelectMultiple } from "@/components/SelectMultiple/SelectMultiple";
import { Switch } from "@/components/Switch/Switch";
import { Textarea } from "@/components/Textarea/Textarea";

const ComponentLibraryPage: Component = () => {
	// ----------------------------------------
	// State
	const [inputText, setInputText] = createSignal("Sample text");
	const [inputEmail, setInputEmail] = createSignal("example@email.com");
	const [inputPassword, setInputPassword] = createSignal("password123");
	const [inputNumber, setInputNumber] = createSignal("42");

	const [textareaValue, setTextareaValue] = createSignal(
		"This is a sample textarea content.\n\nIt supports multiple lines.",
	);

	const [switchValue, setSwitchValue] = createSignal(false);

	const [selectValue, setSelectValue] = createSignal<string | undefined>(
		"option1",
	);
	const selectOptions = [
		{ value: "option1", label: "Option 1" },
		{ value: "option2", label: "Option 2" },
		{ value: "option3", label: "Option 3" },
		{ value: "option4", label: "Option 4" },
	];

	const [selectMultipleValues, setSelectMultipleValues] = createSignal([
		{ value: "option1", label: "Option 1" },
		{ value: "option2", label: "Option 2" },
	]);
	const selectMultipleOptions = [
		{ value: "option1", label: "Option 1" },
		{ value: "option2", label: "Option 2" },
		{ value: "option3", label: "Option 3" },
		{ value: "option4", label: "Option 4" },
		{ value: "option5", label: "Option 5" },
	];

	const [colorValue, setColorValue] = createSignal("#3b82f6");
	const colorPresets = [
		"#ef4444",
		"#f97316",
		"#eab308",
		"#22c55e",
		"#3b82f6",
		"#8b5cf6",
		"#ec4899",
	];

	const [checkboxValue, setCheckboxValue] = createSignal(true);

	const [jsonTextareaValue, setJsonTextareaValue] = createSignal(`{
	"name": "John Doe",
	"age": 30,
	"email": "john@example.com",
	"hobbies": ["reading", "coding", "gaming"]
}`);

	const [searchValue, setSearchValue] = createSignal("");

	const [checkboxButtonValues, setCheckboxButtonValues] = createSignal({
		option1: true,
		option2: false,
		option3: true,
		option4: false,
	});

	const [richTextValue, setRichTextValue] = createSignal({
		type: "doc",
		content: [
			{
				type: "paragraph",
				content: [
					{ type: "text", text: "This is rich text content with formatting." },
				],
			},
		],
	});

	// ----------------------------------------
	// Render
	return (
		<PageLayout
			slots={{
				header: (
					<PageHeader
						copy={{
							title: "Components",
							description: "A simple list of components for testing purposes",
						}}
					/>
				),
			}}
		>
			<DynamicContent
				options={{
					padding: "24",
				}}
			>
				<InfoRow.Root
					title={"Buttons"}
					description={"All of the available buttons"}
				>
					<InfoRow.Content title={"Medium Buttons"}>
						<div class="flex gap-2 flex-wrap">
							<Button size="md" variant="primary" type="button" loading={false}>
								Primary
							</Button>
							<Button
								size="md"
								variant="secondary"
								type="button"
								loading={false}
							>
								Secondary
							</Button>
							<Button size="md" variant="outline" type="button" loading={false}>
								Border Outline
							</Button>
							<Button size="md" variant="danger" type="button" loading={false}>
								Danger
							</Button>
							<Button size="md" variant="ghost" type="button" loading={false}>
								Basic
							</Button>
							<Button size="md" variant="toggle" type="button" loading={false}>
								Secondary Toggle
							</Button>
							<Button
								size="md"
								variant="danger-outline"
								type="button"
								loading={false}
							>
								Danger Outline
							</Button>
						</div>
					</InfoRow.Content>
					<InfoRow.Content title={"Icon Buttons"}>
						<div class="flex gap-2 flex-wrap">
							<Button type="button" variant="primary" size="sm" shape="square">
								<FaSolidXmark />
							</Button>
							<Button
								type="button"
								variant="secondary"
								size="sm"
								shape="square"
							>
								<FaSolidXmark />
							</Button>
							<Button type="button" variant="outline" size="sm" shape="square">
								<FaSolidXmark />
							</Button>
							<Button type="button" variant="danger" size="sm" shape="square">
								<FaSolidXmark />
							</Button>
							<Button type="button" variant="ghost" size="sm" shape="square">
								<FaSolidXmark />
							</Button>
							<Button type="button" variant="toggle" size="sm" shape="square">
								<FaSolidXmark />
							</Button>
							<Button
								type="button"
								variant="danger-outline"
								size="sm"
								shape="square"
							>
								<FaSolidXmark />
							</Button>
						</div>
					</InfoRow.Content>
				</InfoRow.Root>

				{/* Form Components */}
				<InfoRow.Root
					title={"Input Fields"}
					description={"Various input field types with basic and full themes"}
				>
					<InfoRow.Content title={"Text Input"}>
						<div class="space-y-4">
							<Input
								id="text-input-basic"
								value={inputText()}
								onChange={setInputText}
								type="text"
								name="text-input-basic"
								label={"Basic Theme"}
								placeholder={"Enter some text..."}
							/>
							<InsetLabelInput
								id="text-input-full"
								value={inputText()}
								onChange={setInputText}
								type="text"
								name="text-input-full"
								copy={{
									label: "Full Theme",
									placeholder: "Enter some text...",
								}}
							/>
						</div>
					</InfoRow.Content>
					<InfoRow.Content title={"Email Input"}>
						<div class="space-y-4">
							<Input
								id="email-input-basic"
								value={inputEmail()}
								onChange={setInputEmail}
								type="email"
								name="email-input-basic"
								label={"Basic Theme"}
								placeholder={"Enter email address..."}
							/>
							<InsetLabelInput
								id="email-input-full"
								value={inputEmail()}
								onChange={setInputEmail}
								type="email"
								name="email-input-full"
								copy={{
									label: "Full Theme",
									placeholder: "Enter email address...",
								}}
							/>
						</div>
					</InfoRow.Content>
					<InfoRow.Content title={"Password Input"}>
						<div class="space-y-4">
							<Input
								id="password-input-basic"
								value={inputPassword()}
								onChange={setInputPassword}
								type="password"
								name="password-input-basic"
								label={"Basic Theme"}
								placeholder={"Enter password..."}
							/>
							<InsetLabelInput
								id="password-input-full"
								value={inputPassword()}
								onChange={setInputPassword}
								type="password"
								name="password-input-full"
								copy={{
									label: "Full Theme",
									placeholder: "Enter password...",
								}}
							/>
						</div>
					</InfoRow.Content>
					<InfoRow.Content title={"Number Input"}>
						<Input
							id="number-input-basic"
							value={inputNumber()}
							onChange={setInputNumber}
							type="number"
							name="number-input-basic"
							label={"Basic Theme"}
							placeholder={"Enter a number..."}
						/>
					</InfoRow.Content>
				</InfoRow.Root>

				<InfoRow.Root title={"Textarea"} description={"Multi-line text input"}>
					<InfoRow.Content title={"Textarea"}>
						<Textarea
							id="textarea"
							value={textareaValue()}
							onChange={setTextareaValue}
							name="textarea"
							label={"Textarea"}
							placeholder={"Enter multi-line text..."}
						/>
					</InfoRow.Content>
				</InfoRow.Root>

				<InfoRow.Root title={"Switch"} description={"Toggle switch component"}>
					<InfoRow.Content title={"Basic Switch"}>
						<Switch
							id="switch"
							value={switchValue()}
							onChange={setSwitchValue}
							name="switch"
							label={"Enable Feature"}
							trueLabel={"On"}
							falseLabel={"Off"}
						/>
					</InfoRow.Content>
				</InfoRow.Root>

				<InfoRow.Root
					title={"Select"}
					description={"Single selection dropdown"}
				>
					<InfoRow.Content title={"Select"}>
						<div class="space-y-4">
							<Select
								id="select"
								value={selectValue()}
								onChange={setSelectValue}
								options={selectOptions}
								name="select"
								label={"Regular Size"}
								clearable={true}
							/>
							<Select
								id="select-small"
								value={selectValue()}
								onChange={setSelectValue}
								options={selectOptions}
								name="select-small"
								label={"Small Size"}
								size="sm"
								clearable={true}
							/>
						</div>
					</InfoRow.Content>
				</InfoRow.Root>

				<InfoRow.Root
					title={"Select Multiple"}
					description={"Multiple selection dropdown"}
				>
					<InfoRow.Content title={"Select Multiple"}>
						<SelectMultiple
							id="select-multiple"
							values={selectMultipleValues()}
							onChange={setSelectMultipleValues}
							options={selectMultipleOptions}
							name="select-multiple"
							copy={{
								label: "Choose multiple options",
							}}
						/>
					</InfoRow.Content>
				</InfoRow.Root>

				<InfoRow.Root
					title={"Color Picker"}
					description={"Color input with presets"}
				>
					<InfoRow.Content title={"Color Input"}>
						<ColorInput
							id="color"
							value={colorValue()}
							onChange={setColorValue}
							name="color"
							copy={{
								label: "Choose a color",
							}}
							presets={colorPresets}
						/>
					</InfoRow.Content>
				</InfoRow.Root>

				<InfoRow.Root title={"Checkbox"} description={"Single checkbox input"}>
					<InfoRow.Content title={"Checkbox"}>
						<Checkbox
							id="checkbox"
							value={checkboxValue()}
							onChange={setCheckboxValue}
							name="checkbox"
							label={"Accept terms and conditions"}
						/>
					</InfoRow.Content>
				</InfoRow.Root>

				<InfoRow.Root
					title={"JSON Textarea"}
					description={"Textarea with JSON validation"}
				>
					<InfoRow.Content title={"JSON Textarea"}>
						<JSONTextarea
							id="json-textarea"
							value={jsonTextareaValue()}
							onChange={setJsonTextareaValue}
							name="json-textarea"
							copy={{
								label: "JSON Content",
								placeholder: "Enter valid JSON...",
							}}
						/>
					</InfoRow.Content>
				</InfoRow.Root>

				<InfoRow.Root
					title={"Search"}
					description={"Search input with loading state"}
				>
					<InfoRow.Content title={"Basic Search"}>
						<SearchInput
							value={searchValue()}
							onChange={setSearchValue}
							isLoading={false}
						/>
					</InfoRow.Content>
				</InfoRow.Root>

				<InfoRow.Root
					title={"Checkbox Buttons"}
					description={"Button-style checkboxes"}
				>
					<InfoRow.Content title={"Checkbox Buttons"}>
						<div class="flex flex-col gap-2">
							<Checkbox
								variant="button-primary"
								id="checkbox-btn-1"
								value={checkboxButtonValues().option1}
								onChange={(value) =>
									setCheckboxButtonValues((prev) => ({
										...prev,
										option1: value,
									}))
								}
								name="checkbox-btn-1"
								label={"Primary Option (selected)"}
							/>
							<Checkbox
								variant="button-primary"
								id="checkbox-btn-2"
								value={checkboxButtonValues().option2}
								onChange={(value) =>
									setCheckboxButtonValues((prev) => ({
										...prev,
										option2: value,
									}))
								}
								name="checkbox-btn-2"
								label={"Primary Option (not selected)"}
							/>
							<Checkbox
								variant="button-danger"
								id="checkbox-btn-3"
								value={checkboxButtonValues().option3}
								onChange={(value) =>
									setCheckboxButtonValues((prev) => ({
										...prev,
										option3: value,
									}))
								}
								name="checkbox-btn-3"
								label={"Error Option"}
							/>
							<Checkbox
								variant="button"
								id="checkbox-btn-4"
								value={checkboxButtonValues().option4}
								onChange={(value) =>
									setCheckboxButtonValues((prev) => ({
										...prev,
										option4: value,
									}))
								}
								name="checkbox-btn-4"
								label={"No tone, stays neutral (as used by fields)"}
							/>
						</div>
					</InfoRow.Content>
				</InfoRow.Root>

				<InfoRow.Root
					title={"Rich Text Editor"}
					description={"Rich text editor with formatting toolbar"}
				>
					<InfoRow.Content title={"Rich Text Editor"}>
						<RichText
							id="rich-text"
							value={richTextValue()}
							onChange={setRichTextValue}
							copy={{
								label: "Content Editor",
								placeholder: "Start writing...",
							}}
						/>
					</InfoRow.Content>
				</InfoRow.Root>
			</DynamicContent>
		</PageLayout>
	);
};

export default ComponentLibraryPage;
