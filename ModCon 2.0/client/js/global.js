var g = {
    conn: {
        serverPort:             3000,
        serverCapacity:         30,
        serverNum:              4,
    },

    //world settings
    world: {
        id:                     'game-container',
        width:                  2000,
        height:                 2000,
    },

    //map settings
    map: {
        cellSize:               80,
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
            increase:           1.024,
        },
        ground: {
            cost:               50,
            speed:              50, //1 / <actual speed>
        },
        air: {
            cost:               70,
            speed:              85,
            upgradeLVLs: {
                attackDistance: 2,
            },
        },
        rocket: {
            cost:               120,
            speed:              120,
            upgradeLVLs: {
                attackDistance: 2,
            },
        },
    },

    //graphics settings
    graphics: {
        attack: {
            line: {
                width: 6,
                color: 'ff0000',
            },
        },
        vehicle: {

        },
        base: {
            R:                  40,
            color:              'adadad',
        },
        text: {
            style: {
                fill:           '#ffffff',
                stroke:         '#000000',
                strokeThickness:4,
                align:          'center',
            },
        },
        line: {
            width:              4,
            color:              'adadad',
        },
        background: {
            color:              'ffffff',
        },
        image: {
            size:               120,
        },
    },
};

g.graphics.base.r = g.map.cellSize * 0.3; //Padding: 20%
g.graphics.base.R = g.graphics.base.r * Math.sqrt(2);

g.map.cellNumX = g.world.width / g.map.cellSize;
g.map.cellNumY = g.world.height / g.map.cellSize;

g.graphics.base.scale = g.map.cellSize / g.graphics.image.size;
g.graphics.vehicle.scale = g.graphics.base.scale * 0.8;

g.graphics.text.style.font = g.map.cellSize * 0.25 + 'px Impact';

g.game.air.distance = floor(g.map.cellNumX * g.map.cellSize * 0.7);
g.game.rocket.distance = floor(g.map.cellNumX * g.map.cellSize * 0.9);

g.game.ground.increase = 2 / 3;
g.game.air.increase = 2 / 3;
g.game.rocket.increase = g.game.rocket.cost / 120 / (g.game.update.map / 1000) / 3; //1 rocket per 3 update
