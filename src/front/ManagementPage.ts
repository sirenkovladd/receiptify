import van from "vanjs-core";
import type { Card, Folder } from "../back/db";

const { div, h1, ul, li, button, input, form } = van.tags;

const cards = van.state<Card[]>([]);
const folders = van.state<Folder[]>([]);

const fetchCards = async () => {
	const res = await fetch("/api/cards");
	cards.val = await res.json();
};

const fetchFolders = async () => {
	const res = await fetch("/api/folders");
	folders.val = await res.json();
};

const CardsPage = () => {
	fetchCards();
	const newCardName = van.state("");
	const newCardLast4 = van.state("");

	const addCard = async (e: Event) => {
		e.preventDefault();
		await fetch("/api/cards", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: newCardName.val,
				last4: newCardLast4.val,
			}),
		});
		newCardName.val = "";
		newCardLast4.val = "";
		fetchCards();
	};

	return div(
		h1("Cards"),
		ul(() => cards.val.map((card) => li(card.name, " **** ", card.last4))),
		form(
			{ onsubmit: addCard },
			input({ type: "text", value: newCardName, placeholder: "Card Name" }),
			input({
				type: "text",
				value: newCardLast4,
				placeholder: "Last 4 Digits",
			}),
			button({ type: "submit" }, "Add Card"),
		),
	);
};

const FoldersPage = () => {
	fetchFolders();
	const newFolderName = van.state("");

	const addFolder = async (e: Event) => {
		e.preventDefault();
		await fetch("/api/folders", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ name: newFolderName.val }),
		});
		newFolderName.val = "";
		fetchFolders();
	};

	return div(
		h1("Folders"),
		ul(() => folders.val.map((folder) => li(folder.name))),
		form(
			{ onsubmit: addFolder },
			input({ type: "text", value: newFolderName, placeholder: "Folder Name" }),
			button({ type: "submit" }, "Add Folder"),
		),
	);
};

export const ManagementPage = () => {
	return div(CardsPage(), FoldersPage());
};
