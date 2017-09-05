;/*

attackRequest ––> attackPossible ––> attackType–|––> supportAttack
                                                |––> overthrowAttack
                                                |––> changeSideAttack
*/

/*
CORE SERVER MESSAGES

◉  List of all servers [1]

    SEND:       SERVERLIST, <serverList>                                    Every user

◉  Game session started: [2]

    SEND:       GAMESTART, <serverID>                                       Every user

◉  Game session starts in: [4]

    SEND:       GAMESTARTIN, <serverID>, <startTime>                        Every user

◉  Game session ended: [3]

    SEND:       GAMEEND, <serverID>                                         Every user

◉  Game session ends in: [5]

    SEND:       GAMEENDIN, <serverID>, <endTime>                            Every user


◉  New Socket connected to lobby: [0]

    RECEIVE:    CONNECTION, <socket>

◉  New Socket connected to server: [6]

    RECEIVE:    CONNECTION, <socket>                                        Server

◉  New Player connected to server (game): [7]

    RECEIVE:    CONNECT, <name, clan>                                       Server
    SEND:       OPENGAME, <Player>                                          New Player
    UPDATE:     players, property

◉  Player disconnected from server: [8]

    RECEIVE:    DISCONNECT, <socketID>                                      Server
    SEND:       CLOSEGAME, <Player>                                         Every user, connected to <server>
    UPDATE:     players, property


◉  Updates: [9]


◉  Attack: [10]

    RECEIVE:    ATTACK, <baseSenderID>, <baseReceiverID> , <MPShare>            Server

*/





var g =         require('../global.js');
var util =      require('../util.js');

var express =   require('express');
var app =       express();
var http =      require('http').Server(app);
var io =        require('socket.io')(http);
var path =      require('path');

//Random color generator
var randomColor = require('randomcolor');





http.listen(g.conn.serverPort, function() {
    console.log('😤');
});

//Serving static files
app.use(express.static(path.join(__dirname, '/../client'))); //Starting point: 'Modcon 2.0'

//Routing
app.get('/', function(req, res) {
  res.sendFile('index.html');
});




//----SERVER-MANAGER--CLASS----(START)
function ServerManager(numOfServers, gameSessionDuration, breakDuration) {
    this.servers = this.createServers(numOfServers);
};

ServerManager.prototype.createServers =     function (numOfServers) {
    var servers = [];

    for (var i = 0; i < numOfServers; i++) {
        //DECIDE: Server id simple number or unique string
        var server =           new Server(i);
        servers[server.id] =   server;
    };

    return servers;
};

ServerManager.prototype.createSchedule =    function () {
    var _this_ = this;

    for (var i = 0; i < _this_.servers.length; i++) {
        var breakTime = i * g.game.session.breakSession;

        //https://stackoverflow.com/questions/5226285/settimeout-in-for-loop-does-not-print-consecutive-values
        (function (breakTime, i) {
            setTimeout(function() {
                i = (i < _this_.servers.length) ? i : _this_.servers.length - 1; //i can exceed _this_.servers.length

                _this_.servers[i].schedule();
            }, breakTime);
        })(breakTime, i);
    };
};

ServerManager.prototype.serverList =        function() {
    var serverList = [];
    for (var i = 0; i < this.servers.length; i++) {
        serverList.push({
            id:         this.servers[i].id,
            ready:      this.servers[i].ready,
            players:    this.servers[i].players,
        });
    };

    return serverList;
};
//----SERVER-MANAGER--CLASS----(END)







//----SERVER--CLASS----(START)
function Server(id) {
    this.self =     io.of('/' + id);
    this.id =       id;
    this.ready =    false;

    this.players =  [];

    var _this_ =  this;

    this.updates =  {
        updated:            false,

        //baseID
        //property
        //value
        upgrades:           [],

        //Player object
        //? status: null || '-'
        players:            [],

        //property – player's property
        //playerID
        property:           [],

        //baseID – which base's mp is updated
        //mp – base's mp
        mp:                 [],

        //senderID
        //receiverID
        //baseSenderID – animation start point
        //baseReceiverID – animation end point
        animations:         [],


        default:            function () {
            _this_.updates.updated =     false;
            _this_.updates.upgrades =    [];
            _this_.updates.players =     [];
            _this_.updates.property =  [];
            _this_.updates.mp =          [];
            _this_.updates.animations =  [];
        },


        upgradeBase:        function (baseID, property) {
            var upgradeCost = g.game.cost.upgrade[upgradeType][baseID.levels[upgradeType]];
            var totalMP = _this_.players[_this_.map[baseID].owner].totalMP;

            _this_.updates.updated = true;

            //If enough totalMP and base can be upgraded further, proceed
            if (upgradeCost <= totalMP && _this_.map[baseID].levels[property] < g.game.base.upgradeLVLs[property]) {

                _this_.map[baseID].levels[property]++; //update property upgrade level
                _this_.players[_this_.map[baseID].owner].totalMP -= upgradeCost; //update player's totalMP

                _this_.updates.upgrades.push({
                    baseID:     baseID,
                    property:   property,
                });

            };
        },

        updatePlayers:      function (player) {
            //Delete player if it already exists, update and add a new player otherwise
            if (_this_.players[player.id]) {

                //(SERVER)
                delete _this_.players[player.id];
                //(CLIENT)
                //TODO

            } else {

                //(SERVER)
                _this_.players[player.id] = player;
                //(CLIENT)
                //CONN [9.1] (SEND) 'PLAYERUPD', <player>
                _this_.self.emit('PLAYERUPD', player);

            };
        },

        updateProperty:     function (property, playerID) {
            for (var i = 0; i < property.length; i++) {
                var baseID = property[i];
                //(SERVER)
                //If base owner isn't null
                if (_this_.map[baseID].owner) {

                    _this_.players[_this_.map[baseID].owner].property.splice(_this_.players[_this_.map[baseID].owner].property.indexOf(baseID), 1);

                };

                _this_.players[playerID].property.push(baseID);
                _this_.map[baseID].owner =  playerID;

                //(CLIENT)
                //CONN [9.2] (SEND) 'PROPERTYUPD', <baseID>, <playerID>
                _this_.self.emit('PROPERTYUPD', baseID, playerID);
            };
        },

        updateMP:           function (baseID, serverMP, clientMP) {
            //(SERVER)
            _this_.map[baseID].mp = serverMP;
            //(CLIENT)
            //CONN [9.3] (SEND) 'MPUPD', <baseID>, <newMP>
            _this_.self.emit('MPUPD', baseID, clientMP);
        },

        updateAnimations:   function (infoReceiverIDs, baseSenderID, baseReceiverID) {
            _this_.updates.updated = true;

            //(CLIENT) ONLY
            _this_.updates.animations.push({
                infoReceiverIDs:    infoReceiverIDs,
                baseSenderID:       baseSenderID,
                baseReceiverID:     baseReceiverID,
            });
        },
    };


    this.self.on('connection', function (socket) { //CONN [6] (RECEIVE) 'connection', socket
        _this_.self.emit('MAPUPDATE'); //CONN (SEND) [9] Start updating the map

        socket.on('CONNECTME', function (name, clan) { //CONN [7] (RECEIVE) 'CONNECTME', name, clan
             _this_.connectPlayer(socket, name, clan);
        });

        socket.on('DISCONNECTME', function (socket) { //CONN [8] (RECEIVE) 'DISCONNECTME', socketID
            //_this_.disconnectPlayer(socket);
        });



        socket.on('ATTACK', function (baseSenderID, baseReceiverID, MPShare) { //CONN [10] (RECEIVE) 'ATTACK', baseSenderID, baseReceiverID, MPShare
            _this_.attack(baseSenderID, baseReceiverID, MPShare);
        });
    });
};

Server.prototype.schedule = function () {
    var _this_ = this;

    _this_.startGameSession();
    _this_.endGameSessionIn(g.game.session.gameSession);
    setInterval(function() {
        _this_.startGameSession();
        _this_.endGameSessionIn(g.game.session.gameSession);
    }, g.game.session.gameSession + g.game.session.breakSession);
};

Server.prototype.updateLoop = function () {
    var _this_ = this;

    var updateInterval = setInterval(function () {
        if (_this_.updates.updated) {

            var playersUpd = _this_.updates.players;
            var propertyUpd = _this_.updates.property;
            var mpUpd = _this_.updates.mp;

            //CONN [9] (SEND) Updates list; 'UPDATE', <playerUpd, propertyUpd, mpUpd>
            _this_.self.emit('UPDATE', {
                players:        playersUpd,
                property:       propertyUpd,
                mp:             mpUpd,
            });

            //Launch animation to infoReceivers
            /*var animUpdates = _this_.updates.animations;
            for (var i = 0; i < animUpdates.length; i++) {
                for (var j = 0; j < animUpdates[i].infoReceiverIDs.length; i++) {
                    //TODO
                    _this_.self.to(animUpdates[i].infoReceiverIDs[j]).emit('ANIMATIONUPDATE', _this_.updates.animations);
                };
            }; */

            _this_.updates.default();

        };
    }, 1000 / g.conn.serverFPS);
};

Server.prototype.mapUpdateLoop = function () {
    var _this_ = this;

    //Each 4 seconds, every players' base's mp is increased by 2
    this.mapUpdateInterval = setInterval(function () {
        var length = _this_.map.length;

        for (var i = 0; i < length; i++) {
            //Update only bases that belong to some player
            if (_this_.map[i].owner != undefined && _this_.map[i].owner != null) {

                var MPsMultiplier = _this_.map[i].levels.MPs + 1;
                var increase = g.game[_this_.map[i].type].increase * (g.game.update.map / 1000) * MPsMultiplier; //Increase in second * seconds in update
                _this_.map[i].mp += increase;

                _this_.players[_this_.map[i].owner].totalMP += increase; //Player's total mp is increased at the same time as it's bases' mp is increased

                console.log('SERVER [' + _this_.id + '] base [' + i + ']: ' + _this_.map[i].mp);

            };
        };
    }, g.game.update.map);
};




Server.prototype.infoReceivers = function (baseSenderID, baseReceiverID) {
    var _this_ = this;

    var infoReceiverIDs = [];

    infoReceiverIDs = _this_.map[baseSenderID].infoReceivers(_this_.map);
    infoReceiverIDs = infoReceiverIDs.concat(_this_.map[baseReceiverID].infoReceivers(_this_.map));

    return infoReceiverIDs;
};

Server.prototype.attack = function (baseSenderID, baseReceiverID, MPShare) {
    var _this_ = this;

    //Start attack
    var _this_ = this;

    var baseSender = _this_.map[baseSenderID];
    var baseReceiver = _this_.map[baseReceiverID];

    var attackMP = baseSender.mp * MPShare;

    var senderMP = baseSender.mp - attackMP;
    _this_.updates.updateMP(baseSender.id, senderMP, senderMP);



    var attackSpeedMultiplier = (0.5 * (baseReceiver.levels.attackSpeed + 2));
    var speed = g.game[baseSender.type].speed * attackSpeedMultiplier;
    var distance = util.floor(util.distance(baseSender.pos, baseReceiver.pos));
    var time = util.floor(distance / speed) * 1000;

    //Finish attack

    var setAttack = setTimeout(function () {
        if (baseSender.attackPossible(baseReceiver)) {

            var attackType = baseSender.attackType(_this_.map, baseReceiverID);

            if (attackType === 'Support') {

                _this_.finishSupportAttack(baseSenderID, baseReceiverID, attackMP);

            } else if (attackType === 'Overthrow') {

                _this_.finishOverthrowAttack(baseSenderID, baseReceiverID, attackMP);

            } else if (attackType === 'ChangeSide') {

                _this_.finishChangeSideAttack(baseSenderID, baseReceiverID, attackMP, time);

            } else if (attackType === 'Destruction') {

                _this_.finishDestructionAttack(baseSenderID, baseReceiverID, attackMP);

            } else {

                return;

            };

            //var infoReceiverIDs = _this_.infoReceivers(baseSenderID, baseReceiverID); //List of players who will get this message
            //_this_.updates.updateAnimations(infoReceiverIDs, baseSenderID, baseReceiverID);

        };
    }, time);

    console.log('----------------\nMPShare: ', MPShare, '\nattackMP: ', attackMP);
};

Server.prototype.finishSupportAttack =   function (baseSenderID, baseReceiverID, attackMP) {
    console.log('Overthrow');

    var _this_ = this;

    var baseReceiver = _this_.map[baseReceiverID];

    var defenceMultiplier = baseReceiver.levels.defence + 1;

    var defenceMP = baseReceiver.mp;
    var receiverMP = defenceMP + attackMP;

    var serverMP = util.abs(receiverMP);
    var clientMP = util.abs(receiverMP);

    _this_.updates.updateMP(baseReceiver.id, serverMP, clientMP);
};

Server.prototype.finishOverthrowAttack =   function (baseSenderID, baseReceiverID, attackMP) {
    console.log('Overthrow');

    var _this_ = this;

    var baseReceiver = _this_.map[baseReceiverID];

    var defenceMultiplier = baseReceiver.levels.defence + 1;

    var defenceMP = baseReceiver.mp * defenceMultiplier;
    var receiverMP = defenceMP - attackMP;

    var serverMP = util.abs(receiverMP) / defenceMultiplier;
    var clientMP = util.abs(receiverMP) / defenceMultiplier;

    _this_.updates.updateMP(baseReceiver.id, serverMP, clientMP);

    if (receiverMP < 0) {

        _this_.updates.updateProperty([baseReceiver.id], _this_.map[baseSenderID].owner);

    };
};

Server.prototype.finishChangeSideAttack =   function (baseSenderID, baseReceiverID, attackMP, time) {
    console.log('ChangeSide');

    var _this_ = this;

    var baseReceiver = _this_.map[baseReceiverID];

    var defenceMultiplier = baseReceiver.levels.defence + 1;

    var defenceMP = baseReceiver.mp * defenceMultiplier;
    var receiverMP = defenceMP - attackMP;

    var serverMP = util.abs(receiverMP) / defenceMultiplier;
    var clientMP = util.abs(receiverMP) / defenceMultiplier;

    _this_.updates.updateMP(baseReceiver.id, serverMP, clientMP);

    if (receiverMP < 0) {

        _this_.updates.updateProperty([baseReceiver.id], _this_.map[baseSenderID].owner);
        _this_.updates.updateMP(baseReceiverID, 0, 0);

        var counterSupport = setTimeout(function () {
            _this_.finishSupportAttack(baseReceiverID, baseSenderID, serverMP); //return excess until 0
        }, time);

    };
};

Server.prototype.finishDestructionAttack =   function (baseSenderID, baseReceiverID, attackUnits) {
    console.log('Destruction');

    var _this_ = this;

    var baseReceiver = _this_.map[baseReceiverID];

    var defenceMP = baseReceiver.mp;
    var attackMP = defenceMP * 0.2 * attackUnits;
    var receiverMP = defenceMP - attackMP;

    var serverMP, clientMP;

    serverMP = clientMP = (receiverMP < 0)
                          ? 0
                          : receiverMP;

    _this_.updates.updateMP(baseReceiver.id, serverMP, clientMP);
};





//Parent (Senior) functions
Server.prototype.startGameSessionIn = function (startTime) {
    var _this_ = this;

    var startTimeout =  setTimeout(function () {
        _this_.startGameSession();
    }, startTime);

    //CONN [4] (SEND) Game session starts in; 'GAMESTARTIN', startTime, serverID
    lobby.emit('GAMESTARTIN', startTime, _this_.id);
};

Server.prototype.endGameSessionIn = function (endTime) {
    var _this_ = this;

    var endTimeout =    setTimeout(function () {
        _this_.endGameSession();
    }, endTime);

    //CONN [5] (SEND) Game session ends in; 'GAMEENDIN', endTime, serverID
    lobby.emit('GAMEENDIN', endTime, _this_.id);
};

//Child (Junior) functions
Server.prototype.startGameSession = function () {
    var _this_ = this;

    var map =                 new Map();
    _this_.startTime =        Date.now();
    _this_.map =              map.self;
    _this_.linearList =       map.linearList;
    _this_.players =          {};
    _this_.ready =            true; //Players can connect

    //CONN [2] (SEND) Game session start; 'GAMESTART', serverID
    lobby.emit('GAMESTART', _this_.id);

    console.log('GAMESTART ' + _this_.id);

    //_this_.updateLoop(); //Start sending updates
    _this_.mapUpdateLoop(); //Start increasing base mp

};

Server.prototype.endGameSession = function () {
    var _this_ = this;

    _this_.map =            [];
    _this_.linearList =     [];
    _this_.players =        [];
    _this_.ready =          false; //Players cannot connect

    //Clear interval
    clearInterval(_this_.mapUpdateLoop.mapUpdateInterval);

    //CONN [3] (SEND) Game session end; 'GAMEEND', serverID
    lobby.emit('GAMEEND', _this_.id);
};




Server.prototype.connectPlayer = function (socket, name, clan) {
    var _this_ = this;

    //If player connects beforehand, kick him
    if (_this_.ready) {

        //Add to players list
        _this_.openGameFor(socket, name, clan);

    } else {

        //Kick
        socket.disconnect();

    };
};

Server.prototype.disconnectPlayer = function (socket) {
    var _this_ = this;

    //Remove from players list if exists (may be kicked player)
    _this_.updates.updatePlayers(_this_.players[socket.id]);
    _this_.updates.updateProperty(_this_.players[socket.id].property, null);
    //Kick
    socket.disconnect();
};

Server.prototype.openGameFor = function (socket, name, clan) {
    var _this_ = this;

    var currentPlayer = new Player(socket.id, _this_.id, name, clan);

    //CONN [7] (SEND) Start game for a player; 'OPENGAME', <map>, <players>, <playerID>, <startTime>
    socket.emit('OPENGAME', _this_.map, _this_.players, currentPlayer, _this_.startTime);
    _this_.updates.updatePlayers(currentPlayer);
    _this_.updates.updateProperty(currentPlayer.property, currentPlayer.id);
};
//----SERVER--CLASS----(END)







//----PLAYER--CLASS----(START)
function Player (socketID, serverID, name, clan) {
    this.id =           socketID;
    this.server =       serverID;
    this.name =         name;
    this.clan =         clan;
    this.totalMP =      0;
    this.color =        randomColor({
                            luminosity: 'bright',
                        }).slice(1);
    this.property =     [this.findEmpty(serverManager.servers[serverID].map)];
};

Player.prototype.findEmpty =    function(map) {
    for (var i = 0; i < map.length; i++) {
        if ((map[i].owner == undefined || map[i].owner == null) && map[i].type == 'ground') {

            return map[i].id;

        };
     };
};
//----PLAYER--CLASS----(END)







//----MAP--CLASS----(START)
function Map() {
    var linearList =            genList(g.map.cellNumX, g.map.cellNumY);
    this.self =                 initMap(linearList, g.map.baseNum);
    this.linearList =           linearList;

    //Defines property
    function initMap (linearList, mapSize) {
        var map = [];

        for (var i = 0; i < mapSize; i++) {
            //Creates different kinds of base
            var type = genType();

            if (type == 'ground') {

                map.push(new Ground(i, linearList));

            } else if (type == 'air') {

                map.push(new Air(i, linearList));

            } else if (type == 'rocket') {

                map.push(new Rocket(i, linearList));

            };
        };

        for (var i = 0; i < mapSize; i++) {
            JSON.parse(JSON.stringify(map[i]));
            map[i].genBaseConns(map);
        };

        map = mutualConns(map);

        return map;
    };

    //Creates a linear list of cells in map
    function genList (numX, numY) {
        var linearList = [];

        for (var x = 0; x < numX; x++) {
            for (var y = 0; y < numY; y++) {
                linearList.push({x: x, y: y});
            };
        };

        return linearList;
    };

    function genType () {
        var rand = Math.random();

        if (rand <= g.game.ground.prob) {

            return 'ground';

        } else if (rand <= g.game.ground.prob + g.game.air.prob){

            return 'air';

        } else {

            return 'rocket';

        };
    };

    function mutualConns (map) {
        for (var i = 0; i < map.length; i++) {
            for (var j = 0; j < map[i].conns.length; j++) {
                if (map[map[i].conns[j]].conns.indexOf(map[i].id) == -1) {
                    map[map[i].conns[j]].conns.push(map[i].id);
                };
            };
        };

        return map;
    };
};
//----MAP--CLASS----(END)






//----BASE--CLASS----(START)
function Base  (baseID, list, type) {
    this.id =                       baseID;
    this.type =                     type;
    this.conns =                    []; //Generate conns later
    this.pos =                      genRandomPos(list);
    this.mp =                       g.game[type].cost;
    this.levels = {
        defence:                    0,
        MPs:                        0,
        attackSpeed:                0,
        distance:                   0, //only for air and rocket
    };

    //Creates a random position
    function genRandomPos (list) {
        var index =   util.randFromTo(0, list.length);

        var x =       list[index].x;
        var y =       list[index].y;

        list.splice(index, 1);

        return { x: x * g.map.cellSize, y: y * g.map.cellSize };
    };
};

//Creates base connections
Base.prototype.genBaseConns =       function (map) {
    var _this_ =                    this;
    var duplicate =                 map.slice();

    //Sort base in map[] by proximity to given base
    duplicate.sort(function(a, b) {
        var x =                     _this_.pos.x;
        var y =                     _this_.pos.y;

        var first =                 util.pow2(a.pos.x - x) + util.pow2(a.pos.y - y);
        var second =                util.pow2(b.pos.x - x) + util.pow2(b.pos.y - y);

        return                      first - second;
    });

    //Delete first element in duplicate
    duplicate.splice(0, 1);
    //Mutual connectivity: add conns to base, add base to every member of conns
    //TODO: randomize number of connections
    for (var i = 0; i < g.map.connectivity; i++) {
        //Mutual adjacency
        if (_this_.conns.indexOf(duplicate[i].id) == -1) {

            _this_.conns.push(duplicate[i].id);

        };
        //https://stackoverflow.com/a/19590901
    };
};

//TODO: Review
Base.prototype.infoReceivers =      function (map) {
    var _this_ = this;
    var infoReceivers = [];

    for (var i = 0; i < _this_.conns.length; i++) {
        if (infoReceivers.indexOf(map[_this_.conns[i]].owner) === -1) {

            infoReceivers.push(map[_this_.conns[i]].owner);

        };
    };

    return infoReceivers;
};

Base.prototype.attackType = function (map, baseReceiverID) {
    var _this_ = this;

    if (_this_.type === map[baseReceiverID].type && _this_.owner === map[baseReceiverID].owner) {

        return 'Support';

    } else if (_this_.type === map[baseReceiverID].type) {

        return 'Overthrow';

    } else if (_this_.owner !== map[baseReceiverID].owner) {

        return 'ChangeSide';

    } else {

        return 'Impossible';

    };
};

//----BASE--CLASS----(END)

        //'Support' – add allied forces                                             baseReceiver.mp = (mp + attackMP)               baseSender.mp = senderMP - attackMP
        //'Overthrow' – substract, and, if conquered, change sign                   baseReceiver.mp = Math.abs(mp - attackMP)       baseSender.mp = senderMP - attackMP
        //'ChangeSide' – substract, and, if conquered, set to zero, return excess   baseReceiver.mp = (mp - attackMP) || 0          baseSender.mp = senderMP - attackMP + (attackMP - receiverMP).ifPositive
        //'Destruction' - substract                                                 baseReceiver.mp = mp - attackMP                 baseSender.mp = senderMP - attackMP

        //----GROUND-SUBCLASS----(START)
        function Ground(baseID, list) {
            var _this_ = this;

            Base.call(this, baseID, list, 'ground');

            this.attackPossible = function (baseReceiver) {
                var id = baseReceiver.id;

                if (_this_.conns.indexOf(id) !== -1) {

                    console.log('launch ground attack');
                    return true;

                } else {

                    console.log('cannot launch ground attack');
                    return false;

                };
            };
        };

        Ground.prototype = Base.prototype;
        //----GROUND-SUBCLASS----(END)



        //----AIR-SUBCLASS----(START)
        function Air(baseID, list) {
            var _this_ = this;

            Base.call(this, baseID, list, 'air');

            this.attackPossible = function (baseReceiver) {
                var maxAttackDistance = g.game.air.distance * (_this_.levels.distance + 1); //Because levels start from 1
                var pos = baseReceiver.pos
                if (util.distance(_this_.pos, pos) <= maxAttackDistance) {

                    console.log('launch air attack');
                    return true;

                } else {

                    //TODO
                    console.log('cannot launch air attack');
                    return false;

                };
            };
        };

        Air.prototype = Base.prototype;
        //----AIR-SUBCLASS----(END)



        //----ROCKET-SUBCLASS----(START)
        function Rocket(baseID, list) {
            var _this_ = this;

            Base.call(this, baseID, list, 'rocket');

            Rocket.prototype.attackPossible =   function (baseReceiverID) { //TODO
                if (true) {

                    return true;

                };

                return false;
            };

            this.attackType = function (map, baseReceiverID) {
                return 'Destruction';
            };
        };

        Rocket.prototype = Base.prototype;
        //----ROCKET-SUBCLASS----(END)










//|-|_|-|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_||-|_||-|_|
//|-|_|-----------------------------------------------------------------------|-|_|
//|-|_|--------------------------| STARTUP CODE |-----------------------------|-|_|
//|-|_|-----------------------------------------------------------------------|-|_|
//|-|_|-|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_||-|_||-|_|

//----SERVER--STARTUP----(START)
var serverManager = new ServerManager(g.conn.serverNum, g.game.session.gameSession, g.game.session.breakSession);
serverManager.createSchedule();

//----LOBBY----(START)
var lobby =     io.of('/lobby');

//CONN [0] (RECEIVE) Connection to lobby
lobby.on('connection', function(socket) {
    //CONN [1] (SEND) Server list; 'SERVERLIST', serverList
    lobby.emit('SERVERLIST', serverManager.serverList());
});
//----LOBBY----(END)
