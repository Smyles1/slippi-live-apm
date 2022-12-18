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
    ignored: "!*.slp", // TODO: This doesn't work. Use regex?
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
        // Make sure to enable `processOnTheFly` to get updated stats as the game progresses
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
    

    // Uncomment this if you uncomment the stats calculation above. See comment above for details
    // // Do some conversion detection logging
    // // logUpdate(stats);
    // _.forEach(stats.conversions, conversion => {
    //   const key = `${conversion.playerIndex}-${conversion.startFrame}`;
    //   const detected = _.get(gameState, ['detectedPunishes', key]);
    //   if (!detected) {
    //     logUpdate(`[Punish Start] Frame ${conversion.startFrame} by player ${conversion.playerIndex + 1}`);
    //     gameState.detectedPunishes[key] = conversion;
    //     return;
    //   }

    //   // If punish was detected previously, but just ended, let's output that
    //   if (!detected.endFrame && conversion.endFrame) {
    //     const dmg = conversion.endPercent - conversion.startPercent;
    //     const dur = conversion.endFrame - conversion.startFrame;
    //     logUpdate(
    //       `[Punish End] Player ${conversion.playerIndex + 1}'s punish did ${dmg} damage ` +
    //       `with ${conversion.moves.length} moves over ${dur} frames`
    //     );
    //   }

    //   gameState.detectedPunishes[key] = conversion;
    // });

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