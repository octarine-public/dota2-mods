/** Root the loader mounts this package at: a spelled-out repository path does not resolve. */
const icon = (name: string) => `${__OCT_PACKAGE_ROOT__}/scripts_files/icons/${name}.svg`

/** Outline glyphs of the menu: the SDK set where it has one, our own next to it otherwise. */
export const MinifyIcons = {
	Minify: icon("box-remove"),
	State: Menu.Icons.Power,
	Map: icon("map"),
	Effects: Menu.Icons.Sparkles,
	Sounds: Menu.Icons.Volume,
	Other: Menu.Icons.Puzzle
} as const

/** The glyph each mod's row wears, keyed by the mod's id in `mods/index.json`. */
export const ModIcons: Record<string, string> = {
	foilage: icon("tree-pine"),
	dark_terrain: icon("moon"),
	mute_ambient_sounds: Menu.Icons.VolumeOff,
	minify_base_attacks: icon("sword"),
	minify_spells_items: icon("wand-sparkles"),
	misc_optimization: icon("gauge"),
	remove_weather_effects: icon("cloud-rain"),
	remove_river: icon("waves"),
	remove_sprays: icon("spray-can"),
	remove_pings: icon("map-pin"),
	mute_default_announcer: icon("megaphone-off"),
	mute_taunt_sounds: icon("laugh"),
	mute_voice_line_sounds: icon("mic-off")
}
