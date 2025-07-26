import van, { type State } from "vanjs-core";
import type { ParsedReceipt, Tag } from "../../back/analyzer";
import type { ReceiptUpload } from "../../back/db";
import { fetchStoreNames, fetchTags, storeNamesList, tagsList } from "../utils";

const {
	div,
	p,
	form,
	button,
	input,
	label,
	h3,
	textarea,
	select,
	option,
	datalist,
} = van.tags;

const GroceryItems = (items: State<ItemType[]>) => {
	return div(
		{ class: "md3-card" },
		h3("Items"),
		() =>
			div(
				items.val.map((item) =>
					div(
						{ class: "item" },
						input({
							class: "md3-text-field",
							type: "text",
							value: item.name,
							oninput: (e) => {
								item.name.val = e.target.value;
							},
							placeholder: "Item Name",
						}),
						input({
							class: "md3-text-field",
							type: "number",
							value: item.count,
							oninput: (e) => {
								item.count.val = Number(e.target.value);
							},
							min: 1,
						}),
						input({
							class: "md3-text-field",
							type: "number",
							value: item.price,
							oninput: (e: Event) => {
								const target = e.target as HTMLInputElement;
								if (!target) return;
								item.price.val = Number(target.value);
							},
							step: "0.01",
							min: 0,
						}),
						button(
							{
								class: "md3-icon-button",
								onclick: () => {
									items.val = items.val.filter((i) => i !== item);
								},
								title: "Remove item",
							},
							"🗑️",
						),
					),
				),
			),
		() => {
			const total = items.val.reduce(
				(sum, item) => sum + item.count.val * item.price.val,
				0,
			);
			return div({ class: "items-total" }, `Total: ${total.toFixed(2)}`);
		},
		button(
			{
				class: "md3-button",
				onclick: () => {
					items.val = [
						...items.val,
						{
							id: van.state(null),
							name: van.state(""),
							count: van.state(1),
							price: van.state(0),
						},
					];
				},
			},
			"Add Item",
		),
	);
};

const TagInput = (selectedTags: State<Tag[]>) => {
	const newTagName = van.state("");

	const addTag = (tag: Tag) => {
		if (!selectedTags.val.find((t) => t.id === tag.id)) {
			selectedTags.val = [...selectedTags.val, tag];
		}
	};

	const removeTag = (tagId: number) => {
		selectedTags.val = selectedTags.val.filter((t) => t.id !== tagId);
	};

	const handleAddTag = async () => {
		const existingTag = tagsList.val.find((t) => t.name === newTagName.val);
		if (existingTag) {
			addTag(existingTag);
			newTagName.val = "";
		} else {
			// Create a new tag
			const response = await fetch("/api/tags", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: newTagName.val }),
			});
			if (response.ok) {
				const newTag = await response.json();
				addTag(newTag);
				tagsList.val = [...tagsList.val, newTag];
				newTagName.val = "";
			}
		}
	};

	return div(
		{ class: "md3-card" },
		h3("Tags"),
		div(
			{ class: "flex flex-wrap gap-1" },
			selectedTags.val.map((tag) =>
				div(
					{ class: "md3-chip" },
					tag.name,
					button(
						{
							class: "md3-icon-button",
							onclick: () => removeTag(tag.id),
						},
						"×",
					),
				),
			),
		),
		div(
			{ class: "flex items-center mt-2" },
			input({
				class: "md3-text-field",
				type: "text",
				placeholder: "Add a tag",
				value: newTagName,
				oninput: (e) => {
					newTagName.val = e.target.value;
				},
				list: "tags-datalist",
			}),
			datalist(
				{ id: "tags-datalist" },
				tagsList.val.map((tag) => option({ value: tag.name })),
			),
			button({ class: "md3-button", onclick: handleAddTag }, "Add"),
		),
	);
};

type ItemType = {
	id: State<number | null>;
	name: State<string>;
	count: State<number>;
	price: State<number>;
};

export const EditForm = (
	data: Partial<ReceiptUpload>,
	onSave: (data: ReceiptUpload) => void,
) => {
	const fileInput = input({
		class: "md3-text-field",
		type: "file",
		accept: "image/*",
	});
	const statusMessage = van.state("");
	const storeName = van.state(data.storeName || "");
	const type = van.state(data.type || "grocery");
	const datetime = van.state(data.datetime || new Date().toISOString());
	const items = van.state<ItemType[]>(
		data.items?.map((item) => ({
			id: van.state(item.id || null),
			name: van.state(item.name),
			count: van.state(item.quantity),
			price: van.state(item.unitPrice),
		})) || [],
	);

	const imageUrl = van.state<string | null>(data.imageUrl || null);
	const totalAmount = van.state(data.totalAmount || 0);
	const description = van.state(data.description || "");
	const tags = van.state<Tag[]>(data.tags || []);

	fetchStoreNames();
	fetchTags();

	const handleUpload = async (e: Event) => {
		e.preventDefault();
		const file = (fileInput as HTMLInputElement).files?.[0];
		if (!file) {
			statusMessage.val = "Please select a file to upload.";
			return;
		}
		statusMessage.val = "Uploading and analyzing...";
		const formData = new FormData();
		formData.append("receipt", file);

		try {
			const response = await fetch("/api/receipts/analyze", {
				method: "POST",
				body: formData,
			});
			if (!response.ok) throw new Error((await response.json()).message);
			const receipt: ParsedReceipt & {
				totalAmount?: number;
				imageUrl?: string;
			} = await response.json();
			if (receipt.storeName) {
				storeName.val = receipt.storeName;
			}
			datetime.val = receipt.datetime;
			type.val = receipt.type;
			items.val = receipt.items.map((item) => ({
				name: van.state(item.name),
				count: van.state(item.count),
				price: van.state(item.price),
				id: van.state(null),
			}));
			totalAmount.val =
				receipt.totalAmount ||
				items.val.reduce(
					(sum, item) => sum + item.count.val * item.price.val,
					0,
				);
			imageUrl.val = receipt.imageUrl || null;
			statusMessage.val = "Analysis complete. Please review and save.";
		} catch (error) {
			statusMessage.val = `Error: ${(error instanceof Error && error.message) || "Analysis failed."}`;
		}
	};

	const handleSave = async () => {
		statusMessage.val = "Saving...";
		try {
			const isGrocery = type.val === "grocery";
			const finalTotalAmount = isGrocery
				? items.val.reduce(
						(sum, item) => sum + item.count.val * item.price.val,
						0,
					)
				: totalAmount.val;

			const receiptData: ReceiptUpload = {
				storeName: storeName.val,
				datetime: new Date(datetime.val),
				type: type.val,
				totalAmount: finalTotalAmount,
				description: description.val,
				items: isGrocery
					? items.val.map((i) => ({
							name: i.name.val,
							quantity: i.count.val,
							unitPrice: i.price.val,
							category: null,
							id: i.id.val,
						}))
					: [],
				imageUrl: imageUrl.val,
				tags: tags.val.map((t) => t.name),
				id: data.id,
			};

			await onSave(receiptData);
		} catch (err) {
			console.error("Error saving receipt:", err);
			statusMessage.val = `Error: ${err instanceof Error ? err.message : err}`;
		}
	};

	const OtherReceiptDetails = () =>
		div(
			{ class: "md3-grid md3-grid-cols-1@md md3-grid-cols-2" },
			div(
				label("Total Amount:"),
				input({
					class: "md3-text-field",
					type: "number",
					step: "0.01",
					min: 0,
					value: totalAmount,
					oninput: (e) => {
						totalAmount.val = Number((e.target as HTMLInputElement).value);
					},
				}),
			),
			div(
				label("Description:"),
				textarea({
					class: "md3-text-field",
					value: description,
					oninput: (e) => {
						description.val = (e.target as HTMLTextAreaElement).value;
					},
					placeholder: "e.g., Dinner with colleagues",
				}),
			),
		);

	return div(
		{ class: "md3-grid md3-grid-cols-1@md md3-grid-cols-2" },
		div(
			{ class: "md3-card" },
			p("Upload a photo of your receipt to get started."),
			form(
				{ onsubmit: handleUpload },
				fileInput,
				button({ class: "md3-button" }, "Upload and Analyze"),
			),
			() => (statusMessage.val ? p({ class: "error" }, statusMessage.val) : ""),
		),
		div(
			{ class: "md3-card" },
			h3("Receipt Details"),
			div(
				{ class: "md3-grid md3-grid-cols-1@md md3-grid-cols-2" },
				div(
					label({ for: "store-name-input" }, "Store Name:"),
					input({
						id: "store-name-input",
						class: "md3-text-field",
						type: "text",
						value: storeName,
						oninput: (e) => {
							storeName.val = (e.target as HTMLInputElement).value;
						},
						list: "store-names-datalist",
					}),
					() =>
						datalist(
							{ id: "store-names-datalist" },
							storeNamesList.val.map((name) => option({ value: name })),
						),
				),
				div(
					label("Date & Time:"),
					input({
						class: "md3-text-field",
						type: "datetime-local",
						value: () => {
							const date = new Date(datetime.val);
							return date.toISOString().slice(0, 19);
						},
						oninput: (e) => {
							const inputDate = new Date((e.target as HTMLInputElement).value);
							datetime.val = inputDate.toISOString();
						},
					}),
				),
				div(
					label("Type:"),
					select(
						{
							class: "md3-select",
							value: type,
							onchange: (e) => {
								type.val = (e.target as HTMLSelectElement).value;
							},
						},
						option({ value: "grocery" }, "Grocery"),
						option({ value: "restaurant" }, "Restaurant"),
						option({ value: "gas" }, "Gas"),
						option({ value: "retail" }, "Retail"),
						option({ value: "other" }, "Other"),
					),
				),
			),
			() =>
				type.val === "grocery" ? GroceryItems(items) : OtherReceiptDetails(),
			TagInput(tags),
			button(
				{
					class: "md3-button",
					onclick: handleSave,
				},
				"Save Receipt",
			),
		),
	);
};
