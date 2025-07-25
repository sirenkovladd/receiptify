import van, { type State } from "vanjs-core";
import type { ParsedReceipt } from "../../back/analyzer";
import type { ReceiptUpload } from "../../back/db";
import { fetchStoreNames, storeNamesList } from "../utils";

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

// ...GroceryItems component copied from main.ts...

const GroceryItems = (items: State<ItemType[]>) => {
	return div(
		h3("Items"),
		() =>
			div(
				items.val.map((item) =>
					div(
						{ class: "item" },
						input({
							type: "text",
							value: item.name,
							oninput: (e) => {
								item.name.val = e.target.value;
							},
							placeholder: "Item Name",
						}),
						input({
							type: "number",
							value: item.count,
							oninput: (e) => {
								item.count.val = Number(e.target.value);
							},
							min: 1,
						}),
						input({
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
								onclick: () => {
									items.val = items.val.filter((i) => i !== item);
								},
							},
							"Remove",
						),
					),
				),
			),
		() => {
			const total = items.val.reduce(
				(sum, item) => sum + item.count.val * item.price.val,
				0,
			);
			return div({ class: "items-total" }, `Total: $${total.toFixed(2)}`);
		},
		button(
			{
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
	const fileInput = input({ type: "file", accept: "image/*" });
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

	fetchStoreNames();

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
		} catch (error: any) {
			statusMessage.val = `Error: ${error.message || "Analysis failed."}`;
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
				tags: [],
				id: data.id,
			};

			await onSave(receiptData);
		} catch (err: any) {
			console.error("Error saving receipt:", err);
			statusMessage.val = `Error: ${err.message}`;
		}
	};

	const OtherReceiptDetails = () =>
		div(
			div(
				label("Total Amount:"),
				input({
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
					value: description,
					oninput: (e) => {
						description.val = (e.target as HTMLTextAreaElement).value;
					},
					placeholder: "e.g., Dinner with colleagues",
				}),
			),
		);

	return div(
		p("Upload a photo of your receipt to get started."),
		form({ onsubmit: handleUpload }, fileInput, button("Upload and Analyze")),
		() => (statusMessage.val ? p(statusMessage.val) : ""),
		div(
			h3("Receipt Details"),
			div(
				label({ for: "store-name-input" }, "Store Name:"),
				input({
					id: "store-name-input",
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
			() =>
				type.val === "grocery" ? GroceryItems(items) : OtherReceiptDetails(),
			button({ onclick: handleSave }, "Save Receipt"),
		),
	);
};
