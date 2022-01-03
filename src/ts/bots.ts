import * as bots from "../json/bots.json";
import * as botsB11 from "../json/bots_b11.json";
import * as items from "../json/items.json";
import * as itemsB11 from "../json/items_b11.json";
import { Bot } from "./botTypes";
import { botData, createBotDataContent, getBot, initData, leetSpeakMatchTransform, nameToId } from "./common";
import {
    getSpoilersState,
    getSelectedButtonId,
    resetButtonGroup,
    enableBotInfoItemPopovers,
    createHeader,
    registerDisableAutocomplete,
    setSpoilersState,
    getB11State,
    setB11State,
} from "./commonJquery";

import * as jQuery from "jquery";
import "popper.js";
import "bootstrap";

const jq = jQuery.noConflict();
jq(function ($) {
    // Map of bot names to bot elements, created at page init
    const botElements = {};

    // Faction HTML ids to JSON category names
    const factionIdToCategoryName = {
        faction0b10: "0b10",
        factionArchitect: "Architect",
        factionDerelict: "Derelict",
        factionExile: "Exiles",
        factionWarlord: "Warlord",
        factionZionite: "Zionite",
    };

    // Spoiler faction HTML ids
    const spoilerFactionIds = ["factionWarlord", "factionZionite"];

    const redactedFactionIds = ["factionArchitect"];

    $(() => init());

    // Creates the bot buttons and adds them to the grid
    function createBots() {
        const botNames = Object.keys(botData);
        const botsGrid = $("#botsGrid");
        botNames.forEach((botName) => {
            // Creates button that will toggle a popover when pressed displaying
            // various stats and items
            const bot = botData[botName];
            const botId = nameToId(botName);
            const element = $(
                `<button
                    id="${botId}"
                    class="item btn"
                    data-html=true
                    data-content='${createBotDataContent(bot)}'
                    data-toggle="popover">
                    ${botName}
                 </button>`,
            );

            botElements[botName] = element;
            botsGrid.append(element[0]);
        });

        const popoverSelector = $('#botsGrid > [data-toggle="popover"]');
        (popoverSelector as any).popover();
        enableBotInfoItemPopovers(popoverSelector);
    }

    // Gets a filter function combining all current filters
    function getBotFilter() {
        const filters: ((bot: Bot) => boolean)[] = [];

        // Spoilers filter
        const spoilersState = getSpoilersState();
        if (spoilersState === "None") {
            filters.push((bot) => !bot.categories.some((c) => c === "Spoilers" || c === "Redacted"));
        } else if (spoilersState === "Spoilers") {
            filters.push((bot) => !bot.categories.some((c) => c === "Redacted"));
        }

        // Name filter
        const nameValue = ($("#name").val() as string).toLowerCase();
        if (nameValue.length > 1) {
            // Only add a leetspeak convert if > 1 letter to reduce chance of
            // false positives on the translation
            // 2 min works well as it will catch somebody typing in the first half
            // of a bot name, like BR for 8R-AWN
            filters.push((bot) => {
                const lowerName = bot.name.toLowerCase();
                return leetSpeakMatchTransform(lowerName).includes(nameValue) || lowerName.includes(nameValue);
            });
        } else if (nameValue.length > 0) {
            filters.push((bot) => bot.name.toLowerCase().includes(nameValue));
        }

        // Class filter
        const classValue = ($("#class").val() as string).toLowerCase();
        if (classValue.length > 0) {
            filters.push((bot) => bot.class.toLowerCase().includes(classValue));
        }

        // Part filter
        const partValue = ($("#part").val() as string).toLowerCase();
        if (partValue.length > 0) {
            filters.push((bot) => {
                if (bot.armamentData.map((data) => data.name).some((name) => name.toLowerCase().includes(partValue))) {
                    return true;
                }

                if (bot.componentData.map((data) => data.name).some((name) => name.toLowerCase().includes(partValue))) {
                    return true;
                }

                for (let i = 0; i < bot.armamentOptionData.length; i++) {
                    const data = bot.armamentOptionData[i];
                    if (data.map((data) => data.name).some((name) => name.toLowerCase().includes(partValue))) {
                        return true;
                    }
                }

                for (let i = 0; i < bot.componentOptionData.length; i++) {
                    const data = bot.componentOptionData[i];
                    if (data.map((data) => data.name).some((name) => name.toLowerCase().includes(partValue))) {
                        return true;
                    }
                }

                return false;
            });
        }

        // Faction filter
        const factionId = getSelectedButtonId($("#factionContainer"));
        if (factionId in factionIdToCategoryName) {
            const categoryName = factionIdToCategoryName[factionId];
            filters.push((bot) => bot.categories.includes(categoryName));
        }

        // Create a function that checks all filters
        return (bot: Bot) => {
            return filters.every((func) => func(bot));
        };
    }

    // Initialize the page state
    function init() {
        const isB11 = getB11State();
        initData((isB11 ? itemsB11 : items) as any, (isB11 ? botsB11 : bots) as any);

        createBots();
        createHeader("Bots", $("#headerContainer"));
        $("#beta11Checkbox").prop("checked", getB11State());
        registerDisableAutocomplete($(document));

        // Set initial state
        updateFactionVisibility();
        resetFilters();

        // Register handlers
        $("#spoilersDropdown > button").on("click", (e) => {
            const state = $(e.target).text();
            $("#spoilers").text(state);
            setSpoilersState(state);
            ($("#spoilersDropdown > button") as any).tooltip("hide");
            updateFactionVisibility();
            updateBots();
        });
        $("#name").on("input", updateBots);
        $("#class").on("input", updateBots);
        $("#part").on("input", updateBots);
        $("#reset").on("click", () => {
            ($("#reset") as any).tooltip("hide");
            resetFilters();
        });
        $("#factionContainer > label > input").on("change", updateBots);

        $(window).on("click", (e) => {
            if ($(e.target).parents(".popover").length === 0 && $(".popover").length >= 1) {
                // If clicking outside of a popover close the current one
                ($('[data-toggle="popover"]') as any).not(e.target).popover("hide");
            } else if ($(e.target).parents(".popover").length === 1 && $(".popover").length > 1) {
                // If clicking inside of a popover close any nested popovers
                ($(e.target).parents(".popover").find(".bot-popover-item") as any)
                    .not(e.target)
                    .not($(e.target).parents())
                    .popover("hide");
            }
        });

        $("#beta11Checkbox").on("change", () => {
            const isB11 = $("#beta11Checkbox").prop("checked");
            setB11State(isB11);
            const newItems = (isB11 ? itemsB11 : items) as any;
            const newBots = (isB11 ? botsB11 : bots) as any;

            initData(newItems, newBots);

            ($('#botsGrid > [data-toggle="popover"]') as any).popover("dispose");
            $("#botsGrid").empty();

            // Initialize page state
            createBots();
            updateFactionVisibility();
            resetFilters();

            ($("#beta11Checkbox").parent() as any).tooltip("hide");
        });

        // Enable tooltips
        ($('[data-toggle="tooltip"]') as any).tooltip();
    }

    // Resets all filters
    function resetFilters() {
        // Reset text inputs
        $("#name").val("");
        $("#class").val("");
        $("#part").val("");

        // Reset buttons
        resetButtonGroup($("#factionContainer"));

        // Update visible bots
        updateBots();
    }

    // Sorts bot names
    function sortBotNames(botNames: string[]) {
        botNames.sort((a, b) => {
            return a.localeCompare(b);
        });

        return botNames;
    }

    // Clears all existing bots and adds new ones based on the filters
    function updateBots() {
        // Hide any existing popovers
        ($('[data-toggle="popover"]') as any).popover("hide");

        // Get the names of all non-filtered bots
        const botFilter = getBotFilter();
        let bots: string[] = [];
        Object.keys(botData).forEach((botName) => {
            const bot = getBot(botName);

            if (botFilter(bot)) {
                bots.push(bot.name);
            }
        });

        // Sort bot names for display
        bots = sortBotNames(bots);

        // Update visibility and order of all bots
        $("#botsGrid > button").addClass("not-visible");

        let precedingElement = null;

        bots.forEach((botName) => {
            const element = botElements[botName];
            element.removeClass("not-visible");

            if (precedingElement == null) {
                $("#botGrid").append(element);
            } else {
                element.insertAfter(precedingElement);
            }

            precedingElement = element;
        });
    }

    // Updates faction visibility based on the spoiler state
    function updateFactionVisibility() {
        const state = getSpoilersState();
        const showSpoilers = state === "Spoilers";
        const showRedacted = state === "Redacted";

        if (showSpoilers) {
            spoilerFactionIds.forEach((faction) => $(`#${faction}`).removeClass("not-visible"));
            redactedFactionIds.forEach((faction) => $(`#${faction}`).addClass("not-visible"));
        } else if (showRedacted) {
            spoilerFactionIds.forEach((faction) => $(`#${faction}`).removeClass("not-visible"));
            redactedFactionIds.forEach((faction) => $(`#${faction}`).removeClass("not-visible"));
        } else {
            spoilerFactionIds.forEach((faction) => $(`#${faction}`).addClass("not-visible"));
            redactedFactionIds.forEach((faction) => $(`#${faction}`).addClass("not-visible"));
        }
    }
});
