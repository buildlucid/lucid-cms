import type { Component } from "solid-js";
import { createSignal } from "solid-js";
import { DynamicContent, Wrapper } from "@/components/Groups/Layout";
import Button from "@/components/Partials/Button";
import { FaSolidXmark } from "solid-icons/fa";
import { Standard } from "@/components/Groups/Headers";
import InfoRow from "@/components/Blocks/InfoRow";
import PluginLoader from "@/components/PluginLoader";
import {
	Input,
	InputFull,
	Textarea,
	Switch,
	Select,
	SelectMultiple,
	Color,
	Checkbox,
	JSONTextarea,
	Search,
	CheckboxButton,
	WYSIWYG,
} from "@/components/Groups/Form";

const ComponentsRoute: Component = () => {
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

	const [selectValue, setSelectValue] = createSignal<
		string | number | undefined
	>("option1");
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
	});

	const [wysiwygValue, setWysiwygValue] = createSignal(
		"<p>This is <strong>rich text</strong> content with <em>formatting</em>.</p>",
	);

	// ----------------------------------------
	// Render
	return (
		<Wrapper
			slots={{
				header: (
					<Standard
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
							<Button
								size="medium"
								theme="primary"
								type="button"
								loading={false}
							>
								Primary
							</Button>
							<Button
								size="medium"
								theme="secondary"
								type="button"
								loading={false}
							>
								Secondary
							</Button>
							<Button
								size="medium"
								theme="border-outline"
								type="button"
								loading={false}
							>
								Border Outline
							</Button>
							<Button
								size="medium"
								theme="danger"
								type="button"
								loading={false}
							>
								Danger
							</Button>
							<Button size="medium" theme="basic" type="button" loading={false}>
								Basic
							</Button>
							<Button
								size="medium"
								theme="secondary-toggle"
								type="button"
								loading={false}
							>
								Secondary Toggle
							</Button>
							<Button
								size="medium"
								theme="danger-outline"
								type="button"
								loading={false}
							>
								Danger Outline
							</Button>
						</div>
					</InfoRow.Content>
					<InfoRow.Content title={"Icon Buttons"}>
						<div class="flex gap-2 flex-wrap">
							<Button type="button" theme="primary" size="icon">
								<FaSolidXmark />
							</Button>
							<Button type="button" theme="secondary" size="icon">
								<FaSolidXmark />
							</Button>
							<Button type="button" theme="border-outline" size="icon">
								<FaSolidXmark />
							</Button>
							<Button type="button" theme="danger" size="icon">
								<FaSolidXmark />
							</Button>
							<Button type="button" theme="basic" size="icon">
								<FaSolidXmark />
							</Button>
							<Button type="button" theme="secondary-toggle" size="icon">
								<FaSolidXmark />
							</Button>
							<Button type="button" theme="danger-outline" size="icon">
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
								copy={{
									label: "Basic Theme",
									placeholder: "Enter some text...",
								}}
							/>
							<InputFull
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
								copy={{
									label: "Basic Theme",
									placeholder: "Enter email address...",
								}}
							/>
							<InputFull
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
								copy={{
									label: "Basic Theme",
									placeholder: "Enter password...",
								}}
							/>
							<InputFull
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
							copy={{
								label: "Basic Theme",
								placeholder: "Enter a number...",
							}}
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
							copy={{
								label: "Textarea",
								placeholder: "Enter multi-line text...",
							}}
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
							copy={{
								label: "Enable Feature",
								true: "On",
								false: "Off",
							}}
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
								copy={{
									label: "Regular Size",
								}}
							/>
							<Select
								id="select-small"
								value={selectValue()}
								onChange={setSelectValue}
								options={selectOptions}
								name="select-small"
								copy={{
									label: "Small Size",
								}}
								small={true}
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
						<Color
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
							copy={{
								label: "Accept terms and conditions",
							}}
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
						<Search
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
							<CheckboxButton
								id="checkbox-btn-1"
								value={checkboxButtonValues().option1}
								onChange={(value) =>
									setCheckboxButtonValues((prev) => ({
										...prev,
										option1: value,
									}))
								}
								name="checkbox-btn-1"
								copy={{
									label: "Primary Option (selected)",
								}}
								theme="primary"
							/>
							<CheckboxButton
								id="checkbox-btn-2"
								value={checkboxButtonValues().option2}
								onChange={(value) =>
									setCheckboxButtonValues((prev) => ({
										...prev,
										option2: value,
									}))
								}
								name="checkbox-btn-2"
								copy={{
									label: "Primary Option (not selected)",
								}}
								theme="primary"
							/>
							<CheckboxButton
								id="checkbox-btn-3"
								value={checkboxButtonValues().option3}
								onChange={(value) =>
									setCheckboxButtonValues((prev) => ({
										...prev,
										option3: value,
									}))
								}
								name="checkbox-btn-3"
								copy={{
									label: "Error Option",
								}}
								theme="error"
							/>
						</div>
					</InfoRow.Content>
				</InfoRow.Root>

				<InfoRow.Root
					title={"WYSIWYG Editor"}
					description={"Rich text editor with formatting toolbar"}
				>
					<InfoRow.Content title={"Rich Text Editor"}>
						<WYSIWYG
							id="wysiwyg"
							value={wysiwygValue()}
							onChange={setWysiwygValue}
							copy={{
								label: "Content Editor",
								placeholder: "Start writing...",
							}}
						/>
					</InfoRow.Content>
				</InfoRow.Root>

				<InfoRow.Root
					title="Dynamic Plugin"
					description="A proof of concept for dynamic component plugin loading"
				>
					<PluginLoader />
				</InfoRow.Root>
			</DynamicContent>
		</Wrapper>
	);
};

export default ComponentsRoute;
