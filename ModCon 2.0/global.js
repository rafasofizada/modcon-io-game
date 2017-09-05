module.exports = {
    //connection settings
    conn: {
        serverPort:             3000,
        serverCapacity:         30,
        serverNum:              4,
        serverFPS:              4,
    },

    //world settings
    world: {
        width:                  2000,
        height:                 2000,
    },

    //map settings
    map: {
        cellSize:               80,
        connectivity:           5,
    },

    //game component settings
    game: {
        update: {
            map:                3 * 1000,
        },
        session: {
            breakSession:       1 * 1 * 1000,
            gameSession:        15 * 60 * 1000,
        },
        base: {
            upgradeLVLs: {
                defence:        2,
                MPs:            2,
                attackSpeed:    2,
            },
        },
        ground: {
            cost:               50,
            speed:              50, //m/s
            prob:               0.60,
        },
        air: {
            cost:               70,
            speed:              85, //m/s
            prob:               0.30,
            upgradeLVLs: {
                attackDistance: 3,
            },
        },
        rocket: {
            cost:               120,
            speed:              120, //m/s
            prob:               0.10,
            upgradeLVLs: {
                attackDistance: 3,
            },
        },
    },
};

module.exports.map.cellNumX = module.exports.world.width / module.exports.map.cellSize;
module.exports.map.cellNumY = module.exports.world.height / module.exports.map.cellSize;

module.exports.map.baseNum = module.exports.map.cellNumX * module.exports.map.cellNumY * 0.1;

module.exports.game.air.distance = Math.floor(module.exports.map.cellNumX * module.exports.map.cellSize * 0.7);
module.exports.game.rocket.distance = Math.floor(module.exports.map.cellNumX * module.exports.map.cellSize * 0.9);

module.exports.game.ground.increase = 2 / 3;
module.exports.game.air.increase = 2 / 3;
module.exports.game.rocket.increase = module.exports.game.rocket.cost / 120 / (module.exports.game.update.map / 1000) / 3; //1 rocket per 4 updates
