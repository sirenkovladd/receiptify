import van from "vanjs-core";
import type { Receipt } from "./main";
import { NavLink, selectedReceipt } from "./utils"; // import shared value

const { div, h1, p, h3, input, select, option } = van.tags;

const ReceiptCard = (receipt: Receipt) => {
	const handleReceiptClick = (receipt: Receipt) => {
		selectedReceipt.val = receipt;
	};

	return NavLink(
		{
			path: `/edit/${receipt.id}`,
			onclick: () => handleReceiptClick(receipt),
			class: "receipt-card",
		},
		h3(receipt.storeName || "Unnamed Store"),
		p(`Total: ${receipt.totalAmount}`),
		p(`Date: ${new Date(receipt.datetime).toLocaleString()}`),
	);
};

const DashboardPage = () => {
	const receipts = van.state<Receipt[]>([]);
	const loading = van.state(true);
	const error = van.state<string | null>(null);
	const searchTerm = van.state("");
	const sortBy = van.state("datetime"); // 'datetime', 'totalAmount', 'storeName'
	const sortOrder = van.state("desc"); // 'asc', 'desc'

	const fetchReceipts = async () => {
		try {
			loading.val = true;
			error.val = null;
			const response = await fetch("/api/receipts");
			if (!response.ok) {
				throw new Error("Failed to fetch receipts");
			}
			receipts.val = await response.json();
		} catch (err: any) {
			error.val = err.message || "An unknown error occurred.";
		} finally {
			loading.val = false;
		}
	};

	fetchReceipts();

	const filteredAndSortedReceipts = van.derive(() => {
		const term = searchTerm.val.toLowerCase();
		let filtered = receipts.val.filter(
			(r) =>
				r.storeName?.toLowerCase().includes(term) ||
				r.totalAmount.toString().includes(term),
		);

		return filtered.sort((a, b) => {
			const aVal = a[sortBy.val as keyof Receipt];
			const bVal = b[sortBy.val as keyof Receipt];

			let comparison = 0;
			if (aVal > bVal) {
				comparison = 1;
			} else if (aVal < bVal) {
				comparison = -1;
			}
			return sortOrder.val === "desc" ? -comparison : comparison;
		});
	});

	return div(
		{ class: "dashboard-container" },
		h1("Dashboard"),
		p("Here are your saved transactions."),
		div(
			{ class: "filters" },
			input({
				type: "text",
				placeholder: "Search by store or amount...",
				value: searchTerm,
				oninput: (e) => (searchTerm.val = e.target.value),
			}),
			select(
				{ onchange: (e) => (sortBy.val = e.target.value), value: sortBy },
				option({ value: "datetime" }, "Sort by Date"),
				option({ value: "totalAmount" }, "Sort by Amount"),
				option({ value: "storeName" }, "Sort by Store"),
			),
			select(
				{ onchange: (e) => (sortOrder.val = e.target.value), value: sortOrder },
				option({ value: "desc" }, "Descending"),
				option({ value: "asc" }, "Ascending"),
			),
		),
		() => {
			if (loading.val) return p("Loading receipts...");
			if (error.val) return p({ class: "error" }, `Error: ${error.val}`);
			if (filteredAndSortedReceipts.val.length === 0)
				return p("No receipts found. Add one!");

			return div(
				{ class: "receipts-grid" },
				...filteredAndSortedReceipts.val.map((receipt) => ReceiptCard(receipt)),
			);
		},
	);
};

export default DashboardPage;
