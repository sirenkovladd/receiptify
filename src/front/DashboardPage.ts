import van, { type State } from "vanjs-core";
import type { Card, Receipt } from "./main";
import {
	cardsList,
	fetchCards,
	fetchStoreNames,
	jumpPath,
	selectedReceipt,
	storeNamesList,
	tagsList,
} from "./utils"; // import shared value

const {
	div,
	h1,
	p,
	h3,
	input,
	select,
	option,
	button,
	table,
	thead,
	tbody,
	tr,
	th,
	td,
	span,
	datalist,
	ul,
	li,
	form,
} = van.tags;

interface ProductItem {
	id: number;
	userId: number;
	name: string;
	category: string | null;
	lastPrice: number | null;
	createdAt: string;
	updatedAt: string;
}

const Chip = (text: string, type: string = "") => {
	let chipClass = "md3-chip";
	if (type === "tag") {
		chipClass += " md3-chip-tag"; // Custom class for tag chips
	} else if (type === "category") {
		chipClass += " md3-chip-category"; // Custom class for category chips
	}
	return div({ class: chipClass }, text);
};

const ReceiptsTable = (receipts: Receipt[]) => {
	const handleReceiptClick = (receipt: Receipt) => {
		selectedReceipt.val = receipt;
		// TODO - open in popup
		jumpPath(`/edit/${receipt.id}`);
	};

	return table(
		{ class: "md3-data-table" }, // Using md3-data-table for better styling
		thead(
			tr(
				th({ class: "" }, "Date"),
				th({ class: "" }, "Place"),
				th({ class: "" }, "Amount"),
				th({ class: "" }, "Card"),
				th({ class: "" }, "Tags"),
			),
		),
		tbody(
			...receipts.map((receipt) =>
				tr(
					{ onclick: () => handleReceiptClick(receipt) }, // Click handler for each row
					td(
						new Date(receipt.datetime).toLocaleDateString("en-US", {
							year: "numeric",
							month: "short",
							day: "numeric",
						}),
					), // Formatted date
					td(
						div(
							{ class: "flex items-center" }, // Flex container for place and receipt chip
							span({ class: "mr-2" }, receipt.storeName || "N/A"),
							receipt.type === "retail"
								? Chip("Receipt", "receipt-label")
								: null, // Example for a "Receipt" chip
						),
					),
					td(`${parseFloat(receipt.totalAmount).toFixed(2)}`),
					td(
						cardsList.val.find((card) => card.id === receipt.cardId)?.name ||
							"Default",
					),
					td(
						div(
							{ class: "flex flex-wrap gap-1" }, // Flex container for multiple tags
							...(receipt.tags || []).map((tag) => Chip(tag.name, "tag")), // Tags as chips
						),
					),
				),
			),
		),
	);
};

const CardsSidebar = ({
	filterCardId,
	selectedCardId,
}: {
	filterCardId: (id: number | null) => void;
	selectedCardId: State<number | null>;
}) => {
	const newCardName = van.state("");
	const newCardLast4 = van.state("");
	const editingCard = van.state<Card | null>(null);

	const addCard = async (e: Event) => {
		e.preventDefault();
		if (!newCardName.val.trim() || !newCardLast4.val.trim()) return;
		const res = await fetch("/api/cards", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: newCardName.val,
				last4: newCardLast4.val,
			}),
		});
		if (res.ok) {
			newCardName.val = "";
			newCardLast4.val = "";
			fetchCards();
		}
	};

	const deleteCard = async (id: number) => {
		if (confirm("Are you sure you want to delete this card?")) {
			await fetch(`/api/cards/${id}`, { method: "DELETE" });
			fetchCards();
		}
	};

	const startEditing = (card: Card) => {
		editingCard.val = { ...card };
	};

	const cancelEditing = () => {
		editingCard.val = null;
	};

	const saveCard = async (e: Event) => {
		e.preventDefault();
		if (!editingCard.val) return;
		// TODO: Implement update card functionality
		console.log("TODO: Implement update card functionality");
		editingCard.val = null;
		fetchCards();
	};

	return div(
		{ class: "sidebar" },
		h3("Cards"),
		div(
			{
				class: () =>
					selectedCardId.val === null ? "card-item active" : "card-item",
				onclick: () => filterCardId(null),
			},
			"All Cards",
		),
		ul(() =>
			cardsList.val.map((card) =>
				li(
					{
						class: () =>
							selectedCardId.val === card.id ? "card-item active" : "card-item",
						onclick: () => filterCardId(card.id),
					},
					() =>
						editingCard.val?.id === card.id
							? form(
									{ onsubmit: saveCard },
									input({
										type: "text",
										value: editingCard.val.name,
										oninput: (e) => {
											editingCard.val = {
												...editingCard.val,
												name: e.target.value,
											};
										},
									}),
									input({
										type: "text",
										value: editingCard.val.last4,
										oninput: (e) => {
											editingCard.val = {
												...editingCard.val,
												last4: e.target.value,
											};
										},
									}),
									button({ type: "submit" }, "Save"),
									button({ type: "button", onclick: cancelEditing }, "Cancel"),
								)
							: div(
									span(card.name),
									button(
										{
											onclick: (e) => {
												e.stopPropagation();
												startEditing(card);
											},
										},
										"Edit",
									),
									button(
										{
											onclick: (e) => {
												e.stopPropagation();
												deleteCard(card.id);
											},
										},
										"Delete",
									),
								),
				),
			),
		),
		form(
			{ onsubmit: addCard },
			input({
				type: "text",
				value: newCardName,
				placeholder: "Card Name",
				class: "md3-text-field",
			}),
			input({
				type: "text",
				value: newCardLast4,
				placeholder: "Last 4",
				class: "md3-text-field",
			}),
			button({ type: "submit", class: "md3-button" }, "Add Card"),
		),
	);
};

const TransactionTaab = ({
	loading,
	error,
	searchTerm,
	sortBy,
	sortOrder,
	filteredAndSortedReceipts,
	filterDateFrom,
	filterDateTo,
	filterMinAmount,
	filterMaxAmount,
	filterType,
	filterStore,
	filterTags,
	clearFilters,
}: {
	loading: State<boolean>;
	error: State<string | null>;
	searchTerm: State<string>;
	sortBy: State<string>;
	sortOrder: State<string>;
	filteredAndSortedReceipts: State<Receipt[]>;
	filterDateFrom: State<string>;
	filterDateTo: State<string>;
	filterMinAmount: State<string>;
	filterMaxAmount: State<string>;
	filterType: State<string>;
	filterStore: State<string>;
	filterTags: State<string[]>;
	clearFilters: () => void;
}) => {
	const inputValue = van.state("");
	return div(
		// Filters section
		div(
			{ class: "md3-card" },
			div(
				{ style: "display: flex; align-items: center; margin-bottom: 16px;" },
				div({ innerHTML: "🔍", style: "margin-right: 8px;" }),
				h3({ style: "margin: 0; font-weight: 500;" }, "Filters"),
			),
			div(
				{ class: "md3-grid md3-grid-cols-2 md3-grid-cols-4@md" },
				input({
					class: "md3-text-field",
					type: "text",
					placeholder: "Search by store or amount...",
					value: searchTerm,
					oninput: (e) => {
						searchTerm.val = e.target.value;
					},
				}),
				input({
					id: "store-name-input",
					class: "md3-text-field",
					type: "text",
					placeholder: "Store name",
					value: filterStore,
					list: "store-names-datalist",
					oninput: (e) => {
						filterStore.val = e.target.value;
					},
				}),
				() =>
					datalist(
						{ id: "store-names-datalist" },
						storeNamesList.val.map((name) => option({ value: name })),
					),
				select(
					{
						class: "md3-select",
						value: filterType,
						onchange: (e) => {
							filterType.val = e.target.value;
						},
					},
					option({ value: "" }, "All Types"),
					option({ value: "grocery" }, "Grocery"),
					option({ value: "restaurant" }, "Restaurant"),
					option({ value: "gas" }, "Gas"),
					option({ value: "retail" }, "Retail"),
					option({ value: "other" }, "Other"),
				),
				// Improved TypeAhead input for tags
				div({ style: "display: flex; flex-direction: column; gap: 8px;" }, () =>
					div(
						{
							class: "md3-text-field-container", // Apply your Material Design container styling here
							style:
								"display: flex; flex-wrap: wrap; align-items: center; gap: 4px; border: 1px solid #ccc; padding: 6px 8px; border-radius: 4px; min-height: 48px; background-color: white; position: relative;",
						},
						// Display selected tags as chips
						() =>
							div(
								filterTags.val.map((tagName) =>
									div(
										{ class: "md3-chip md3-chip-filled" },
										span(tagName),
										button(
											{
												class: "md3-icon-button",
												style:
													"margin-left:8px; padding: 0; width: auto; height: 20px; line-height: 1;color: #FFF;",
												onclick: () => {
													filterTags.val = filterTags.val.filter(
														(t) => t !== tagName,
													);
												},
											},
											"✕",
										),
									),
								),
							),
						// The main input field for typing new tags
						input({
							class: "md3-text-field",
							type: "text",
							placeholder: () =>
								filterTags.val.length === 0 ? "Filter by tags..." : "", // Placeholder only if no tags
							value: inputValue, // Bind to local state
							list: "tags-typeahead-datalist",
							style:
								"flex-grow: 1; border: none; outline: none; background: transparent; padding: 0; width: auto;",
							oninput: (e) => {
								console.log("input", e, e.target.value);
								inputValue.val = e.target.value; // Update local state on input
							},
							onkeydown: (e) => {
								if (
									e.key === "Backspace" &&
									inputValue.val === "" &&
									filterTags.val.length > 0
								) {
									// Allow deleting last chip with backspace if input is empty
									filterTags.val = filterTags.val.slice(0, -1);
								}
							},
							onchange: (e) => {
								console.log("change", e, inputValue.val);
								// Handles selection from datalist (click or tab)
								const val = inputValue.val.trim(); // Use current inputValue
								const match = tagsList.val.find(
									(tag) => tag.name.toLowerCase() === val.toLowerCase(),
								);
								if (match) {
									if (!filterTags.val.includes(match.name)) {
										filterTags.val = [...filterTags.val, match.name];
									}
									setTimeout(() => {
										inputValue.val = ""; // Clear input after adding
									});
								}
							},
						}),
						// Datalist for type-ahead suggestions
						() =>
							datalist(
								{ id: "tags-typeahead-datalist" },
								tagsList.val
									.filter((tag) => !filterTags.val.includes(tag.name)) // Only show tags not already selected
									.map((tag) => option({ value: tag.name })),
							),
					),
				),
				inputValue,

				input({
					class: "md3-text-field",
					type: "date",
					placeholder: "Date from",
					value: filterDateFrom,
					oninput: (e) => {
						filterDateFrom.val = e.target.value;
					},
				}),
				input({
					class: "md3-text-field",
					type: "date",
					placeholder: "Date to",
					value: filterDateTo,
					oninput: (e) => {
						filterDateTo.val = e.target.value;
					},
				}),
				input({
					class: "md3-text-field",
					type: "number",
					placeholder: "Min amount",
					value: filterMinAmount,
					oninput: (e) => {
						filterMinAmount.val = e.target.value;
					},
				}),
				input({
					class: "md3-text-field",
					type: "number",
					placeholder: "Max amount",
					value: filterMaxAmount,
					oninput: (e) => {
						filterMaxAmount.val = e.target.value;
					},
				}),
				select(
					{
						class: "md3-select",
						value: sortBy,
						onchange: (e) => {
							sortBy.val = e.target.value;
						},
					},
					option({ value: "datetime" }, "Sort by Date"),
					option({ value: "totalAmount" }, "Sort by Amount"),
					option({ value: "storeName" }, "Sort by Store"),
				),
				select(
					{
						class: "md3-select",
						value: sortOrder,
						onchange: (e) => {
							sortOrder.val = e.target.value;
						},
					},
					option({ value: "desc" }, "Descending"),
					option({ value: "asc" }, "Ascending"),
				),
			),
			div(
				{
					style: "margin-top: 16px; display: flex; justify-content: flex-end;",
				},
				button(
					{
						class: "md3-button md3-button-text",
						onclick: clearFilters,
					},
					"Clear Filters",
				),
			),
		),
		// Results section
		div(
			{
				class: "md3-card md3-card-elevated",
				style: "padding: 0; overflow-x: auto; margin-top: 16px;",
			},
			() => {
				if (loading.val)
					return p({ style: "padding: 16px;" }, "Loading receipts...");
				if (error.val)
					return p(
						{ class: "error", style: "padding: 16px;" },
						`Error: ${error.val}`,
					);
				if (filteredAndSortedReceipts.val.length === 0)
					return p({ style: "padding: 16px;" }, "No receipts found. Add one!");

				return ReceiptsTable(filteredAndSortedReceipts.val);
			},
		),
		// Floating Action Button
		button(
			{
				class: "md3-fab",
				onclick: () => {
					window.location.hash = "#/add";
				},
			},
			div({ innerHTML: "➕" }),
		),
	);
};

const getQueryStringFromHash = () => {
	const hash = window.location.search;
	const queryStringIndex = hash.indexOf("?");
	if (queryStringIndex !== -1) {
		return hash.substring(queryStringIndex + 1);
	}
	return "";
};

const DashboardPage = () => {
	const urlParams = new URLSearchParams(getQueryStringFromHash());
	const receipts = van.state<Receipt[]>([]);
	const loading = van.state(true);
	const error = van.state<string | null>(null);
	const searchTerm = van.state(urlParams.get("q") || "");
	const sortBy = van.state<"datetime" | "totalAmount" | "storeName">(
		(urlParams.get("sortBy") as "datetime" | "totalAmount" | "storeName") ||
			"datetime",
	);
	const sortOrder = van.state(urlParams.get("sortOrder") || "desc");
	const activeTab = van.state(urlParams.get("tab") || "transactions");
	const filterTags = van.state<string[]>(
		urlParams.get("tags") ? urlParams.get("tags")?.split(",") : [],
	);

	const products = van.state<ProductItem[]>([]);
	const productsLoading = van.state(true);
	const productsError = van.state<string | null>(null);

	fetchStoreNames();
	fetchCards();

	// Filter states
	const filterDateFrom = van.state(urlParams.get("dateFrom") || "");
	const filterDateTo = van.state(urlParams.get("dateTo") || "");
	const filterMinAmount = van.state(urlParams.get("minAmount") || "");
	const filterMaxAmount = van.state(urlParams.get("maxAmount") || "");
	const filterType = van.state(urlParams.get("type") || "");
	const filterStore = van.state(urlParams.get("store") || "");
	const selectedCardId = van.state<number | null>(null);

	const filterByCard = (id: number | null) => {
		selectedCardId.val = id;
	};

	van.derive(() => {
		const params = new URLSearchParams();

		if (activeTab.val === "transactions") {
			if (searchTerm.val) params.set("q", searchTerm.val);
			if (sortBy.val !== "datetime") params.set("sortBy", sortBy.val);
			if (sortOrder.val !== "desc") params.set("sortOrder", sortOrder.val);
			if (activeTab.val !== "transactions") params.set("tab", activeTab.val);
			if (filterTags.val.length > 0)
				params.set("tags", filterTags.val.join(","));
			if (filterDateFrom.val) params.set("dateFrom", filterDateFrom.val);
			if (filterDateTo.val) params.set("dateTo", filterDateTo.val);
			if (filterMinAmount.val) params.set("minAmount", filterMinAmount.val);
			if (filterMaxAmount.val) params.set("maxAmount", filterMaxAmount.val);
			if (filterType.val) params.set("type", filterType.val);
			if (filterStore.val) params.set("store", filterStore.val);
		} else {
			params.set("tab", activeTab.val);
		}

		const queryString = params.toString();

		if (window.location.search !== `?${queryString}`) {
			const newUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ""}`;
			window.history.replaceState({}, "", newUrl);
		}
	});

	const fetchReceipts = async () => {
		try {
			loading.val = true;
			error.val = null;
			const response = await fetch("/api/receipts");
			if (!response.ok) {
				throw new Error("Failed to fetch receipts");
			}
			receipts.val = await response.json();
		} catch (err) {
			error.val =
				(err instanceof Error && err.message) || "An unknown error occurred.";
		} finally {
			loading.val = false;
		}
	};

	const fetchProducts = async () => {
		try {
			productsLoading.val = true;
			productsError.val = null;
			const response = await fetch("/api/products");
			if (!response.ok) {
				throw new Error("Failed to fetch products");
			}
			const data = await response.json();
			products.val = data.map((item: ProductItem) => ({
				...item,
				lastPrice: item.lastPrice === null ? null : Number(item.lastPrice),
			}));
		} catch (err) {
			productsError.val =
				(err instanceof Error && err.message) || "An unknown error occurred.";
		} finally {
			productsLoading.val = false;
		}
	};

	const filteredAndSortedReceipts = van.derive(() => {
		const term = searchTerm.val.toLowerCase();
		const filtered = receipts.val.filter(
			(r) =>
				(r.storeName?.toLowerCase().includes(term) ||
					r.totalAmount.toString().includes(term)) &&
				(!filterDateFrom.val ||
					new Date(r.datetime) >= new Date(filterDateFrom.val)) &&
				(!filterDateTo.val ||
					new Date(r.datetime) <= new Date(filterDateTo.val)) &&
				(!filterMinAmount.val ||
					parseFloat(r.totalAmount) >= parseFloat(filterMinAmount.val)) &&
				(!filterMaxAmount.val ||
					parseFloat(r.totalAmount) <= parseFloat(filterMaxAmount.val)) &&
				(!filterType.val || r.type === filterType.val) &&
				(!filterStore.val ||
					r.storeName?.toLowerCase().includes(filterStore.val.toLowerCase())) &&
				(!filterTags.val.length ||
					filterTags.val.every((tag) =>
						r.tags?.some((t) => t.name.toLowerCase() === tag.toLowerCase()),
					)) &&
				(selectedCardId.val === null || r.cardId === selectedCardId.val),
		);

		return filtered.sort((a, b) => {
			const sortByVal = sortBy.val;
			const aVal =
				sortByVal === "totalAmount"
					? parseFloat(a[sortByVal])
					: String(a[sortByVal]);
			const bVal =
				sortByVal === "totalAmount"
					? parseFloat(b[sortByVal])
					: String(b[sortByVal]);

			let comparison = 0;
			if (aVal > bVal) {
				comparison = 1;
			} else if (aVal < bVal) {
				comparison = -1;
			}
			return sortOrder.val === "desc" ? -comparison : comparison;
		});
	});

	const clearFilters = () => {
		searchTerm.val = "";
		filterDateFrom.val = "";
		filterDateTo.val = "";
		filterMinAmount.val = "";
		filterMaxAmount.val = "";
		filterType.val = "";
		filterStore.val = "";
		filterTags.val = [];
		sortBy.val = "datetime";
		sortOrder.val = "desc";
	};

	const totalAmount = van.derive(() => {
		return filteredAndSortedReceipts.val.reduce((sum, receipt) => {
			return sum + parseFloat(receipt.totalAmount);
		}, 0);
	});

	return div(
		{ class: "md3-container" },
		div(
			{ class: "flex" },
			CardsSidebar({ filterCardId: filterByCard, selectedCardId }),
			div(
				{ class: "flex-1" },
				div(
					{ class: "md3-top-app-bar" },
					h1({ class: "md3-top-app-bar-title" }, "Dashboard"),
				),
				// Stats cards
				div(
					{ class: "md3-grid md3-grid-cols-1 md3-grid-cols-3@md mb16" },
					div(
						{ class: "md3-stat-card" },
						div({ class: "md3-stat-icon" }, div({ innerHTML: "📋" })),
						div(
							{ class: "md3-stat-content" },
							h3(() => filteredAndSortedReceipts.val.length.toString()),
							p("Total Transactions"),
						),
					),
					div(
						{ class: "md3-stat-card" },
						div({ class: "md3-stat-icon" }, div({ innerHTML: "💰" })),
						div(
							{ class: "md3-stat-content" },
							h3(() => `${totalAmount.val.toFixed(2)}`),
							p("Total Amount"),
						),
					),
					div(
						{ class: "md3-stat-card" },
						div({ class: "md3-stat-icon" }, div({ innerHTML: "🏪" })),
						div(
							{ class: "md3-stat-content" },
							h3(() => {
								const stores = new Set(
									filteredAndSortedReceipts.val.map((r) => r.storeName),
								);
								return stores.size.toString();
							}),
							p("Unique Stores"),
						),
					),
				),
				// Tabs
				div(
					{ class: "md3-card" },
					button(
						{
							class: () =>
								`md3-tab ${activeTab.val === "transactions" ? "md3-tab-active" : ""}`,
							onclick: () => {
								activeTab.val = "transactions";
							},
						},
						"Transactions",
					),
					button(
						{
							class: () =>
								`md3-tab ${activeTab.val === "products" ? "md3-tab-active" : ""}`,
							onclick: () => {
								activeTab.val = "products";
							},
						},
						"Products",
					),
					button(
						{
							class: () =>
								`md3-tab ${activeTab.val === "analytics" ? "md3-tab-active" : ""}`,
							onclick: () => {
								activeTab.val = "analytics";
							},
						},
						"Analytics",
					),
				),
				() => {
					if (activeTab.val === "transactions") {
						if (receipts.val.length === 0 && !error.val) {
							fetchReceipts();
						}
						return TransactionTaab({
							loading,
							error,
							searchTerm,
							sortBy,
							sortOrder,
							filteredAndSortedReceipts,
							filterDateFrom,
							filterDateTo,
							filterMinAmount,
							filterMaxAmount,
							filterType,
							filterStore,
							filterTags,
							clearFilters,
						});
					}
					if (activeTab.val === "products") {
						if (products.val.length === 0 && !productsError.val) {
							fetchProducts();
						}
						return ProductsTab({
							products: products,
							loading: productsLoading,
							error: productsError,
						});
					}
					// TODO - implement Analytics tab
					return "";
				},
			),
		),
	);
};

const ProductsTab = ({
	products,
	loading,
	error,
}: {
	products: State<ProductItem[]>;
	loading: State<boolean>;
	error: State<string | null>;
}) => {
	// Add states for filtering and sorting
	const searchTerm = van.state("");
	const sortBy = van.state("name"); // Default sort by name
	const sortOrder = van.state("asc");

	const filteredAndSortedItems = van.derive(() => {
		const term = searchTerm.val.toLowerCase();
		const filtered = products.val.filter(
			(item) =>
				item.name.toLowerCase().includes(term) ||
				item.category?.toLowerCase().includes(term),
		);

		return filtered.sort((a, b) => {
			const sortByVal = sortBy.val as keyof ProductItem;
			const aVal =
				sortByVal === "lastPrice"
					? a[sortByVal]
					: String(a[sortByVal] || "").toLowerCase();
			const bVal =
				sortByVal === "lastPrice"
					? b[sortByVal]
					: String(b[sortByVal] || "").toLowerCase();

			if (aVal === null) return 1; // put nulls at the end
			if (bVal === null) return -1;
			if (aVal === bVal) return 0;

			const comparison = aVal > bVal ? 1 : -1;

			return sortOrder.val === "desc" ? -comparison : comparison;
		});
	});

	return div(
		{ class: "md3-card md3-card-elevated", style: "margin-top: 16px;" },
		div(
			{ class: "md3-card", style: "padding: 16px; display: flex; gap: 16px;" },
			input({
				class: "md3-text-field",
				type: "text",
				placeholder: "Search by product or category...",
				value: searchTerm,
				oninput: (e) => {
					searchTerm.val = e.target.value;
				},
				style: "flex-grow: 1;",
			}),
			select(
				{
					class: "md3-select",
					value: sortBy,
					onchange: (e) => {
						sortBy.val = e.target.value;
					},
				},
				option({ value: "name" }, "Sort by Name"),
				option({ value: "category" }, "Sort by Category"),
				option({ value: "lastPrice" }, "Sort by Price"),
			),
			select(
				{
					class: "md3-select",
					value: sortOrder,
					onchange: (e) => {
						sortOrder.val = e.target.value;
					},
				},
				option({ value: "asc" }, "Ascending"),
				option({ value: "desc" }, "Descending"),
			),
		),
		() => {
			if (loading.val)
				return p({ style: "padding: 16px;" }, "Loading products...");
			if (error.val)
				return p(
					{ class: "error", style: "padding: 16px;" },
					`Error: ${error.val}`,
				);
			if (filteredAndSortedItems.val.length === 0)
				return p({ style: "padding: 16px;" }, "No products found.");

			return table(
				{ class: "md3-data-table" },
				thead(
					tr(
						th("Product Name"),
						th("Category"),
						th("Last Price"),
						th("Last Updated"),
					),
				),
				tbody(
					...filteredAndSortedItems.val.map((item) =>
						tr(
							td(item.name),
							td(item.category || "N/A"),
							td(item.lastPrice !== null ? item.lastPrice.toFixed(2) : "N/A"),
							td(
								new Date(item.updatedAt).toLocaleDateString("en-US", {
									year: "numeric",
									month: "short",
									day: "numeric",
								}),
							),
						),
					),
				),
			);
		},
	);
};

export default DashboardPage;
