import { MinifyIcons, ModIcons } from "./icons"

interface ModConfig {
	name: string
	description?: string
	defaultState?: boolean
	dependencies?: string[]
}

/** A card of the page: the mods it holds, by id, in the order its rows stand. */
interface Section {
	name: string
	icon: string
	mods: string[]
}

/** The page's name, and the one configs saved before the rename keep its rows under. */
const PageName = "Minify"
const OldPageName = "Dota 2 Minify"

/** The cards the page is laid out in; a mod none of them names lands in a card of its own. */
const Sections: Section[] = [
	{
		name: "Map",
		icon: MinifyIcons.Map,
		mods: ["foilage", "dark_terrain", "remove_river", "remove_weather_effects"]
	},
	{
		name: "Effects",
		icon: MinifyIcons.Effects,
		mods: [
			"minify_spells_items",
			"minify_base_attacks",
			"misc_optimization",
			"remove_sprays",
			"remove_pings"
		]
	},
	{
		name: "Sounds",
		icon: MinifyIcons.Sounds,
		mods: [
			"mute_default_announcer",
			"mute_voice_line_sounds",
			"mute_taunt_sounds",
			"mute_ambient_sounds"
		]
	}
]

export class MenuManager {
	public readonly State: Menu.Toggle
	public readonly ModToggles = new Map<string, Menu.Toggle>()

	constructor(mods: string[], config: Record<string, ModConfig>) {
		const rowName = (mod: string) => config[mod]?.name ?? mod
		const layout = layOut(mods)
		const entry = Menu.AddEntry("Changer")

		MenuSDK.AddConfigMigration(raw =>
			migrate(MenuSDK.ConfigSubtreeOf(raw, entry.entry), layout, rowName)
		)
		migrate(entry.entry.stored, layout, rowName)

		const page = entry.AddNode(PageName, MinifyIcons.Minify)
		page.SortNodes = false

		this.State = page.AddToggle(
			"State",
			true,
			"Turns every mod on or off at once.",
			-1,
			MinifyIcons.State
		)
		page.HeaderControl = this.State
		page.Gate = this.State

		for (const section of layout) {
			const card = page.AddNode(section.name, section.icon)
			card.SortNodes = false
			for (const mod of section.mods) {
				const toggle = card.AddToggle(
					rowName(mod),
					config[mod]?.defaultState ?? false,
					config[mod]?.description ?? "",
					-1,
					ModIcons[mod]
				)
				this.ModToggles.set(mod, toggle)
			}
		}
	}
}

/** The cards that hold at least one of the mods, with a last one for those no card names. */
function layOut(mods: string[]): Section[] {
	const placed = new Set(Sections.flatMap(section => section.mods))
	const cards: Section[] = [
		...Sections.map(section => ({
			...section,
			mods: section.mods.filter(mod => mods.includes(mod))
		})),
		{ name: "Other", icon: MinifyIcons.Other, mods: mods.filter(mod => !placed.has(mod)) }
	]
	return cards.filter(card => card.mods.length !== 0)
}

/** The rows a stored config keeps under a node, or nothing when the value is not a node. */
function objectOf(value: unknown): Nullable<MenuSDK.ConfigObject> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as MenuSDK.ConfigObject)
		: undefined
}

/**
 * Carries the page saved under its old name over to the new one, and the rows it kept flat
 * into the cards they stand in now. Idempotent, as a config migration must be: a config
 * already in the new shape keeps what it has there, and the old keys go either way.
 */
function migrate(
	changer: Nullable<MenuSDK.ConfigObject>,
	layout: Section[],
	rowName: (mod: string) => string
): void {
	if (changer === undefined) {
		return
	}
	MenuSDK.RenameStoredRow(changer, OldPageName, PageName)
	const page = objectOf(changer[PageName])
	if (page === undefined) {
		return
	}
	for (const section of layout) {
		for (const mod of section.mods) {
			const row = rowName(mod)
			if (!(row in page)) {
				continue
			}
			const card = objectOf(page[section.name]) ?? {}
			card[row] ??= page[row]
			page[section.name] = card
			delete page[row]
		}
	}
}
