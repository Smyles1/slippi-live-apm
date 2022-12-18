// ATTRIBUTIONS:
// Most of this code is from https://github.com/project-slippi/slippi-js/blob/master/examples/realtimeFileReads.js
// They use an open source license so I think its fine to do this but basically all creadit goes to them


const { SlippiGame } = require("@slippi/slippi-js");
const chokidar = require("chokidar");
const _ = require("lodash");
const fs = require('fs'); 
var path = require('path');

function logUpdate(progress){
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(progress);
}

logUpdate("starting...");



fs.readFile(path.dirname(process.execPath) + path.sep + 'options.txt', 'utf8', (err, data) => { // Opens options.txt
    let splitData = data.split(/\r?\n/)
    var listenPath = splitData[0].substring(splitData[0].indexOf(":") + 1).trim()
    var cCode = splitData[1].substring(splitData[1].indexOf(":") + 1).trim()
    if (listenPath.trim() === "") { // If path is empty, set path to the current directory of the program
		logUpdate("Please add a path in options.txt");
        return;
	} else if (!(listenPath.trim().charAt(listenPath.length - 1) === path.sep)) {
		listenPath = listenPath + path.sep;
	}

    logUpdate(`Waiting for game...`);

    const watcher = chokidar.watch(listenPath, {
        ignored: "!*.slp",
        depth: 0,
        persistent: true,
        usePolling: true,
        ignoreInitial: true,
    });

    const gameByPath = {};
    let counter = 0;
    watcher.on("change", (path) => {
    let gameState, settings, stats, frames, latestFrame, gameEnd, game;
    try {
        game = _.get(gameByPath, [path, "game"]);
        if (!game) {
        logUpdate(`New file at: ${path}`);
        game = new SlippiGame(path, { processOnTheFly: true });
        gameByPath[path] = {
            game: game,
            state: {
            settings: null,
            detectedPunishes: {},
            },
        };
        }

        gameState = _.get(gameByPath, [path, "state"]);

        settings = game.getSettings();
        gameEnd = game.getGameEnd();
    } catch (err) {
        logUpdate(err);
        return;
    }

    if (!gameState.settings && settings) {
        logUpdate(`[Game Start] New game has started`);
        gameState.settings = settings;
    }
    if(counter%3 == 0){
        _.forEach(settings.players, (player) => {
            if (player.connectCode.toLowerCase() === cCode.toLowerCase()){
                stats = game.getStats();
                logUpdate('IPM: ' + Math.floor(stats.overall[player.playerIndex].inputsPerMinute.ratio));
            }
        });
    }

    if (gameEnd) {
        // NOTE: These values and the quitter index will not work until 2.0.0 recording code is
        // NOTE: used. This code has not been publicly released yet as it still has issues
        const endTypes = {
        1: "TIME!",
        2: "GAME!",
        7: "No Contest",
        };

        const endMessage = _.get(endTypes, gameEnd.gameEndMethod) || "Unknown";

        const lrasText = gameEnd.gameEndMethod === 7 ? ` | Quitter Index: ${gameEnd.lrasInitiatorIndex}` : "";
        logUpdate(`[Game Complete] Type: ${endMessage}${lrasText}`);
    }
    counter++;
    });
});