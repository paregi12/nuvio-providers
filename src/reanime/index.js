import { getStreams } from './streamextraction.js';
import { getAnimeInfo, search } from './metadata.js';
import { getHome } from './home.js';

async function onSettings() {
    return [
        { type: "header", label: "Domain Selection" },
        {
            type: "select",
            key: "domain",
            label: "Preferred Domain",
            description: "Reanime operates across multiple domains. Choose the one currently working for you.",
            options: [
                { label: "reanime.to", value: "https://reanime.to" },
                { label: "reanime.cz", value: "https://reanime.cz" },
                { label: "reanime.wtf", value: "https://reanime.wtf" }
            ],
            defaultValue: "https://reanime.to"
        }
    ];
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getStreams,
        getAnimeInfo,
        getDetails: getAnimeInfo,
        getHome,
        getMainPage: getHome,
        search,
        searchAnime: search,
        onSettings
    };
} else {
    global.getStreams = getStreams;
    global.getAnimeInfo = getAnimeInfo;
    global.getDetails = getAnimeInfo;
    global.getHome = getHome;
    global.getMainPage = getHome;
    global.search = search;
    global.searchAnime = search;
    global.onSettings = onSettings;
}
