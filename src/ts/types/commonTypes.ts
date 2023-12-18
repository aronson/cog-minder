import { Bot } from "../botTypes";
import { Item } from "./itemTypes";

export type PageType = "About" | "Bots" | "Build" | "Combat" | "Hacks" | "Lore" | "Parts" | "RIF" | "Simulator" | "Wiki";

export const pageTypes: PageType[] = ["About", "Bots", "Build", "Hacks", "Lore", "Parts", "RIF", "Simulator", "Wiki"];

// An enum to represent spoiler level
export type Spoiler = "None" | "Spoiler" | "Redacted";
export const localStorageSpoilerName = "spoilers";

// A map location
export type MapLocation = {
    branch: boolean;
    entries: MapLocation[];
    exits: MapLocation[];
    imageName: string | undefined;
    minDepth: number;
    maxDepth: number;
    multipleDepths: boolean;
    name: string;
    preDepthBranch: boolean;
    specialBots: Bot[];
    specialItems: Item[];
    spoiler: Spoiler;
};

export type ThemeType = "Dark" | "Cogmind";
export const localStorageThemeName = "theme";

export const localStorageCombatLogChartDisplayOptions = "combatLogChartDisplayOptions";
