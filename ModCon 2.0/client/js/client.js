//For receiving and storing stuff from Server
var info = {};

//General game stuff
var game = new function() {
    var _this_ = this;
    var cursors;

    this.bytes = 0;

    //TEST
    this.increaseDataUsage = function (object) {
        var data = roughSizeOfObject(object);

        _this_.bytes += data;
        console.log('Total: ' + _this_.bytes + ' bytes    |||    ' + '+' + data + 'bytes');
    };

    this.graphics = {
        bases:  [],
        lines:  {},
        text:   [],
    };

    //Create a new game, assign a map, import players and make it visible
    this.init = function(map, players, startTime) {
        _this_.startTime = startTime; //game start time
        _this_.map = map;
        _this_.players = players || {};
        _this_.selectModule = {
            selectShare: -1,
            receiver: -1, //-1 = background
            default: function () {
                _this_.selectModule.sender = undefined;
                _this_.selectModule.receiver = undefined;
                _this_.selectModule.selectShare = -1;
                _this_.selectModule.receiver = -1; //select background

                //Clear attack line
                if (_this_.graphics.attack) {
                    _this_.graphics.attack.line.clear();
                    _this_.graphics.attack.cursor.destroy(); //clear cursor
                    _this_.graphics.attack.attackMPMeter.destroy(); //clear attackMPMeter
                    _this_.graphics.attack = undefined;
                };
            },
            launch: function (MPShare) {
                //console.log('selectModule: ', _this_.selectModule);

                var senderID = _this_.selectModule.sender;
                var receiverID = _this_.selectModule.receiver;

                _this_.map[senderID].attack(receiverID, MPShare);
                _this_.selectModule.default();
            },
        };

        _this_.self = new Phaser.Game(window.innerWidth, window.innerHeight, Phaser.CANVAS, g.world.id, {
            preload: _this_.preload,
            create: _this_.create,
            update: _this_.update,
        }, false, false); //last parameters for transparency and anti-alias

        //Make the game visible
        _this_.visible();
    };

    this.preload = function() {
        _this_.self.load.image('tile', '../img/tile2.png');

        _this_.self.load.image('ground-0', '../img/ground-0.png');
        _this_.self.load.image('ground-1', '../img/ground-1.png');
        _this_.self.load.image('ground-2', '../img/ground-2.png');

        _this_.self.load.image('air-0', '../img/air-0.png');
        _this_.self.load.image('air-1', '../img/air-1.png');
        _this_.self.load.image('air-2', '../img/air-2.png');

        _this_.self.load.image('rocket-0', '../img/rocket-0.png');
        _this_.self.load.image('rocket-1', '../img/rocket-1.png');
        _this_.self.load.image('rocket-2', '../img/rocket-2.png');

        _this_.self.load.spritesheet('helicopter', '../img/helicopter.png', 120, 120);
        _this_.self.load.image('tank', '../img/tank.png');
        _this_.self.load.image('rocket', '../img/rocket.png');

        _this_.self.load.image('cursorAttack', '../img/cursor-attack.png');
        _this_.self.load.image('cursorAttackCancel', '../img/cursor-attack-cancel.png');
    };

    this.create = function() {
        //Borders
        _this_.self.world.setBounds(-100, -100, g.world.width + 200, g.world.height + 200);

        //Performance
        _this_.self.forceSingleUpdate = true;

        //Set world properties
        _this_.resize();
        window.onresize = function() {
            _this_.resize();
        };

        //Keep on running when losing focus
        _this_.self.stage.disableVisibilityChange = true;

        //On background click restore the selectModule;
        _this_.self.stage.inputEnabled = true;

        //Enable input
        cursors = _this_.self.input.keyboard.createCursorKeys();

        //Draw background
        _this_.self.stage.backgroundColor = '0x' + g.graphics.background.color;

        //Background image
        _this_.graphics.background = _this_.self.add.tileSprite(-100, -100, g.world.width + 200, g.world.height + 200, 'tile');

        //Cancel attack on background click
        _this_.graphics.background.inputEnabled = true;

        _this_.graphics.background.events.onInputDown.add(function () {
            _this_.selectModule.default();
        }, this);

        _this_.graphics.background.events.onInputOver.add(function () {
            _this_.selectModule.receiver = -1;
        }, this);

        //Create a physical map
        _this_.physicalLines(_this_.map);
        _this_.physicalBases(_this_.map, _this_.players);
    };

    this.update = function() {
        //Controls
        _this_.drag();
        //Attack line
        if (_this_.graphics.attack) {

            var mouseX = _this_.self.input.mousePointer.x + _this_.self.camera.x;
            var mouseY = _this_.self.input.mousePointer.y + _this_.self.camera.y;

            _this_.graphics.attack.line.clear();
            _this_.graphics.attack.line.lineStyle(g.graphics.attack.line.width, '0x' + _this_.players[_this_.graphics.attack.line.owner].color);
            _this_.graphics.attack.line.moveTo(_this_.graphics.attack.line.pos.x + g.graphics.base.r, _this_.graphics.attack.line.pos.y + g.graphics.base.r);
            _this_.graphics.attack.line.lineTo(mouseX, mouseY);

            //Attack cursor
            _this_.graphics.attack.cursor.destroy();

            if (_this_.selectModule.receiver != -1 && _this_.map[_this_.selectModule.sender].attackPossible(_this_.selectModule.receiver)){

                _this_.graphics.attack.cursor = _this_.self.add.sprite(mouseX - 20, mouseY - 20, 'cursorAttack');

            } else {

                _this_.graphics.attack.cursor = _this_.self.add.sprite(mouseX - 20, mouseY - 20, 'cursorAttackCancel');

            };

            _this_.graphics.attack.cursor.scale.setTo(g.graphics.base.scale * 0.5);

            //Attack MP
            _this_.graphics.attack.attackMPMeter.x = mouseX;
            _this_.graphics.attack.attackMPMeter.y = mouseY + 35;

        };
    };





    //Adjust game proportions to every screen size
    this.resize = function() {
        var width = window.innerWidth;
        var height = window.innerHeight;

        _this_.self.scale.setGameSize(width, height);
        _this_.self.camera.setSize(width, height);
    };

    //Drag map http://www.html5gamedevs.com/topic/9814-move-camera-by-dragging-the-world-floor/
    this.drag = function() {

        var speedOfView = 40;

        if (cursors.up.isDown) {

            _this_.self.camera.y -= speedOfView;

        };

        if (cursors.down.isDown) {

            _this_.self.camera.y += speedOfView;

        };

        if (cursors.left.isDown) {

            _this_.self.camera.x -= speedOfView;

        };

        if (cursors.right.isDown) {

            _this_.self.camera.x += speedOfView;

        };
    };





    this.visible = function() {
        DOM.indexContainer.style.visibility = 'hidden';

        DOM.ui.playerStatBar.style.visibility = 'initial';
        DOM.ui.leaderboard.style.visibility = 'initial';
    };

    this.invisible = function() {
        DOM.indexContainer.style.visibility = 'initial';

        DOM.ui.playerStatBar.style.visibility = 'hidden';
        DOM.ui.leaderboard.style.visibility = 'hidden';
    };




    this.physicalBases = function(map, players) {
        for (var i = 0; i < map.length; i++) {
            map[i] = new Base(map[i], players[map[i].owner]);
        };
    };

    this.physicalLines = function(map) {
        for (var i = 0; i < map.length; i++) {
            for (var j = 0; j < map[i].conns.length; j++) {
                Line(map[i], map[map[i].conns[j]]);
            };
        };
    };




    //Connection
    this.connectme = function () {
        _this_.socket = Socket(player.server); //CONN [6] (SEND) Connection to server; 'connection', socket

        _this_.socket.emit('CONNECTME', player.name, player.clan); //CONN [7] (SEND) Connection to game 'CONNECTME', name, clan

        game.increaseDataUsage(['CONNECTME', player.name, player.clan]);
    };





    this.updatePlayers = function (player) {
        //Add new player to players
        _this_.players[player.id] = player;
        //Update server info
        info.servers[player.server].players[player.id] = player;
    };

    this.updateProperty = function (baseID, playerID) {
        //Update belonging
        if (_this_.players[playerID].property.indexOf(baseID) == -1) {

            player.property.push(baseID);
            _this_.players[playerID].property.push(baseID);

        };
        _this_.map[baseID].owner = playerID;
        _this_.map[baseID].color = '0x' + _this_.players[playerID].color;

        //Update if exists
        if (_this_.graphics.bases[0]) {

            //Bases
            _this_.graphics.bases[baseID].tint = '0x' + _this_.players[playerID].color;
            //Lines
            var base = _this_.map[baseID];
            for (var k = 0; k < base.conns.length; k++) {
                _this_.graphics.lines[baseID][base.conns[k]] = Line(base, _this_.map[base.conns[k]]);
            };
            //Bring base to top (front) after lines
            _this_.graphics.bases[baseID].bringToTop();
            _this_.graphics.text[baseID].bringToTop();

        };

        //Increase price of all other bases by 30%
        if (playerID == player.id) {

            var length = _this_.map.length;
            for (var i = 0; i < length; i++) {
                if (player.property.indexOf(i) == -1) {

                    if (_this_.graphics.bases[0]) {

                        //TODO: DOM text
                        //Update mp text
                        var textPosX = _this_.graphics.text[i].x;
                        var textPosY = _this_.graphics.text[i].y;

                        _this_.graphics.text[i].destroy();
                        _this_.graphics.text[i] = _this_.self.add.text(textPosX, textPosY, '  ' + Math.round(_this_.map[i].mp) + '  ', g.graphics.text.style);
                        _this_.graphics.text[i].anchor.setTo(0.5);

                    };

                };
            };

        };
    };

    this.updateMP = function (baseID, newMP) {
        //Update MP
        _this_.map[baseID].mp = newMP;
        //Update text only if game.graphics.text exist
        if (_this_.graphics.text[0]) {
            //TODO: DOM text
            var textPosX = game.graphics.text[baseID].x;
            var textPosY = game.graphics.text[baseID].y;

            _this_.graphics.text[baseID].destroy();
            _this_.graphics.text[baseID] = _this_.self.add.text(textPosX, textPosY, '  ' + floor(newMP) + '  ', g.graphics.text.style);
            _this_.graphics.text[baseID].anchor.setTo(0.5);

        };
    };
};




//TODO: Form validation
var DOM = new function() {
    var _this_ = this;
    //Containers
    this.gameContainer = document.getElementById('game-container');
    this.uiContainer = document.getElementById('ui-container');
    this.indexContainer = document.getElementById('index-container');

    //Input
    this.input = document.getElementById('input');
    this.inputName = document.getElementById('nickname');
    this.inputClan = document.getElementById('clan');
    this.selectServer = document.getElementById('server-select');
    this.inputButton = document.getElementById('button');

    //Display
    this.displayServerID = document.getElementById('server-id');
    this.displayServerCapacity = document.getElementById('server-capacity');

    //Dialog
    this.ui = document.getElementsByClassName('ui');
    this.ui.playerStatBar = document.getElementsByClassName('ui-player-stat-bar')[0];
        this.ui.playerStatBar.nickname = this.ui.playerStatBar.getElementsByClassName('player-stat-nickname')[0];
        this.ui.playerStatBar.totalMP = this.ui.playerStatBar.getElementsByClassName('player-stat-value')[0];
    this.ui.leaderboard = document.getElementsByClassName('ui-leaderboard')[0];
    this.ui.upgrade = document.getElementsByClassName('ui-upgrade')[0];

    //Validate user input
    this.validateInput = function() {
        return true;
    };


    //Event controllers

    //Form submission without refresh
    this.input.onsubmit = function (e) {
        e.preventDefault();
    };

    this.inputButton.onclick = function () {
        //TODO: validate input
        if (DOM.validateInput()) {

            player.getSetCredentials();
            game.connectme();

        } else {

            //TODO: show error message

        };
    };

    this.selectServer.onchange = function () {
        var selectedServerID = this.options[this.selectedIndex].value;
        UI.serverInfo(selectedServerID);
    };

    //Update UI
    this.ui.playerStatBar.init = function (name, clan, totalMP, baseNum) {
        this.ui.playerStatBar.nickname.innerHTML = name + ' [' + clan + ']';
    };
};




var player = new function () {
    var _this_ = this;

    this.init = function (proto) {
        _this_.id = proto.id;
        _this_.server = proto.server;
        _this_.name = proto.name;
        _this_.clan = proto.clan;
        _this_.color = proto.color;
        _this_.property = proto.property;
        _this_.totalMP = proto.totalMP;
    };

    this.getSetCredentials = function () {
        //Get name and clan of current player
        //https://stackoverflow.com/a/11090301
        _this_.name = DOM.inputName.value.replace(/[`~^\-=?;:'",.<>\{\}\[\]\\\/]/gi, '').substring(0, 18);
        //If clan name is null, set it to GUEST
        _this_.clan = DOM.inputClan.value.replace(/[`~^\-=?;:'",.<>\{\}\[\]\\\/]/gi, '') == null ? 'GUEST' : DOM.inputClan.value.replace(/(<([^>]+)>)/ig, '').substring(0, 5);
        //Find server to connect
        _this_.server = DOM.selectServer.options[DOM.selectServer.selectedIndex].value;
    };

    /*this.enoughForUpgrade = function (baseID, upgradeType) {
        if (this.totalMP >= g.game.cost.upgrade[upgradeType][baseID.levels[upgradeType]]) {

            return true;

        } else {

            return false;

        };
    };*/
};




var UI = new function() {
    var _this_ = this;
    //Display server list inside <select>
    this.serverList = function(serverList) {
        for (var i = 0; i < serverList.length; i++) {
            var option = document.createElement('option');
            var index = serverList[i].id + 1;
            option.value = serverList[i].id;
            option.innerHTML = "Server " + index;
            DOM.selectServer.appendChild(option);
        };
    };

    //Display server info
    this.serverInfo = function(selectedServerID) {
        //https://stackoverflow.com/a/35398031
        var server = info.servers.find(function(x) {
            return x.id == selectedServerID;
        });
        var index = server.id + 1;
        DOM.displayServerID.innerHTML = "Server #" + index;
        DOM.displayServerCapacity.innerHTML = "<span class='available'>" + Object.keys(server.players).length + "</span>" + " / " + g.conn.serverCapacity;
    };
};




function Base (proto, player) {
    var id = this.id = proto.id;
    var type = this.type = proto.type;
    var mp = this.mp = proto.mp;
    var levels = this.levels = proto.levels;
    var color = this.color = '0x' + ((player)
                        ? player.color
                        : g.graphics.base.color);
    var owner = this.owner = (player ? player.id : undefined);

    this.pos = proto.pos;
    this.conns = proto.conns;

    var scale = g.graphics.base.scale;
    var size = g.graphics.image.size;

    var sqrt2 = Math.sqrt(2);
    var startAngle = 0;

    var x = this.pos.x;
    var y = this.pos.y;
    var r = g.graphics.base.r;


    var textPosX = Math.floor(x + r);
    var textPosY = Math.floor(y + r);

    game.graphics.bases[id] = game.self.add.sprite(x - (size * scale * 0.2), y - (size * scale * 0.2), type + '-' + levels.defence);
    game.graphics.bases[id].tint = color;
    game.graphics.bases[id].scale.setTo(scale);

    //Event listeners
    game.graphics.bases[id].inputEnabled = true;
    game.graphics.bases[id].input.useHandCursor = true;
    game.graphics.bases[id].events.onInputDown.add(function () {
        game.map[id].select();
    }, this);

    //On hover over a base, change the cursor to attack cursor
    game.graphics.bases[id].events.onInputOver.add(function () {
        game.selectModule.receiver = id; //set selected place to base id
    }, this);

    game.graphics.text[id] = game.self.add.text(textPosX, textPosY, '  ' + Math.round(this.mp) + '  ', g.graphics.text.style);
    game.graphics.text[id].anchor.setTo(0.5);
};

Base.prototype.select = function () {
    var _this_ = this;
    //Add base id to first part of select module if it's empty
    if (game.selectModule.sender == undefined) {

        var mouseX = game.self.input.mousePointer.x + game.self.camera.x;
        var mouseY = game.self.input.mousePointer.y + game.self.camera.y;

        game.selectModule.selectShare++;
        game.selectModule.sender = _this_.id;

        //Add an arrow
        game.graphics.attack = {};
        game.graphics.attack.line = game.self.add.graphics(0, 0);
        game.graphics.attack.line.lineStyle(g.graphics.attack.line.width, game.map[_this_.id].color);
        game.graphics.attack.line.moveTo(game.map[_this_.id].pos.x, game.map[_this_.id].pos.y);
        game.graphics.attack.line.lineTo(mouseX, mouseY);
        game.graphics.attack.line.pos = game.map[_this_.id].pos;
        game.graphics.attack.line.owner = game.map[_this_.id].owner;

        //Add an attack cursor
        game.graphics.attack.cursor = game.self.add.graphics(mouseX, mouseY);

        //Add an attack mp text
        game.selectModule.attackMP = floor(_this_.mp * 1 / Math.pow(2, game.selectModule.selectShare));
        game.graphics.attack.attackMPMeter = game.self.add.text(mouseX, mouseY + 35, '-' + game.selectModule.attackMP, g.graphics.text.style);
        game.graphics.attack.attackMPMeter.anchor.setTo(0.5);

    } else {

        if (game.selectModule.sender == _this_.id) {

            if (game.selectModule.selectShare ==  3) {

                game.selectModule.default();
                //console.log('max MPShare');

            } else {

                //Destroy the attackMPMeter and update its text to new attack mp value
                game.selectModule.selectShare++;
                //Display attack MP below the cursor
                game.selectModule.attackMP = floor(_this_.mp * 1 / Math.pow(2, game.selectModule.selectShare));
                game.graphics.attack.attackMPMeter.destroy();
                game.graphics.attack.attackMPMeter = game.self.add.text(mouseX, mouseY + 35, '-' + game.selectModule.attackMP, g.graphics.text.style);
                game.graphics.attack.attackMPMeter.anchor.setTo(0.5);

            };

        } else {

            game.selectModule.receiver = _this_.id;
            //Launch attack after everything is declared
            game.selectModule.launch(1 / Math.pow(2, game.selectModule.selectShare));

        };

    };
};

Base.prototype.attack = function (baseReceiverID, MPShare) {
    var _this_ = this;

    //console.log('attack type: ', game.map[baseReceiverID].type, '\ndefence mp: ', game.map[baseReceiverID].mp, '\nattack mp: ', _this_.mp * MPShare);

    var baseReceiver = game.map[baseReceiverID];

    if (_this_.type == 'ground') {

        if (_this_.attackPossible(baseReceiverID)) {

            game.socket.emit('ATTACK', _this_.id, baseReceiverID, MPShare); //CONN [10] (SEND) 'ATTACK', baseSenderID, baseReceiverID, MPShare
            _this_.launchAttack('tank', game.map[baseReceiverID]);

            game.increaseDataUsage(['ATTACK', _this_.id, baseReceiverID, MPShare]);

        };

    } else if (_this_.type == 'air') {

        if (_this_.attackPossible(baseReceiverID)) {

            game.socket.emit('ATTACK', _this_.id, baseReceiverID, MPShare); //CONN [10] (SEND) 'ATTACK', baseSenderID, baseReceiverID, MPShare
            _this_.launchAttack('helicopter', game.map[baseReceiverID]);

            game.increaseDataUsage(['ATTACK', _this_.id, baseReceiverID, MPShare]);

        };

    } else if (_this_.type == 'rocket') {

        if (_this_.attackPossible(baseReceiverID)) {

            game.socket.emit('ATTACK', _this_.id, baseReceiverID, MPShare); //CONN [10] (SEND) 'ATTACK', baseSenderID, baseReceiverID, mpShare
            _this_.launchAttack('rocket', game.map[baseReceiverID]);

            game.increaseDataUsage(['ATTACK', _this_.id, baseReceiverID, MPShare]);

        };

    };
};

Base.prototype.attackPossible = function (baseReceiverID) {
    var _this_ = this;

    if (_this_.type == 'ground') {

        if (_this_.conns.indexOf(baseReceiverID) !== -1 && _this_.mp) {

            //console.log('launch ground attack');
            return true;

        } else {

            //TODO
            //console.log('cannot launch ground attack');
            return false;

        };

    } else if (_this_.type == 'air') {

        var maxAttackDistance = g.game.air.distance * (_this_.levels.distance + 1);

        if (distance(_this_.pos, game.map[baseReceiverID].pos) <= maxAttackDistance  && _this_.mp) {

            //console.log('launch air attack');
            return true;

        } else {

            //TODO
            //console.log('cannot launch air attack');
            return false;

        };

    } else if (_this_.type == 'rocket') {

        var maxAttackDistance = g.game.rocket.distance * (_this_.levels.distance + 1);

        if (distance(_this_.pos, game.map[baseReceiverID].pos) <= maxAttackDistance  && _this_.mp) {

            //console.log('launch rocket attack');
            return true;

        } else {

            //TODO
            //console.log('cannot launch rocket attack');
            return false;

        };

    };
};

Base.prototype.launchAttack = function (type, baseReceiver) {
    var _this_ = this;

    var pos1 = _this_.pos;
    var pos2 = baseReceiver.pos;
    var r = g.graphics.base.r;

    var attackSpeedMultiplier =         (0.5 * (baseReceiver.levels.attackSpeed + 2));
    var distanceTo =                    distance(pos1, pos2);
    var attackTime =                    Math.round(distanceTo / (g.game[_this_.type].speed * attackSpeedMultiplier));
    var rotationDegree =                degree(pos1, pos2) + 90;


    var troop = game.self.add.sprite(pos1.x + r, pos1.y + r, type);
    troop.anchor.setTo(0.5);
    troop.scale.setTo(g.graphics.vehicle.scale);
    troop.angle = rotationDegree;
    troop.tint = _this_.color;
    //behavioural animation
    var behaviour = troop.animations.add('behaviour');
    troop.animations.play('behaviour', 30, true);

    //attack animation (pos1 -> pos2)
    var tween = game.self.add.tween(troop).to({ x: pos2.x + r, y: pos2.y + r }, attackTime * 1000, Phaser.Easing.Default, true);
    tween.onComplete.add(function () {
        troop.destroy();
    }, this);
};

/*Base.prototype.upgradeDefence = function () {
    var _this_ = this;

    if (player.enoughForUpgrade(_this_.id, 'defence')) {

        game.socket.emit('UPGRADE', 'defence', _this_.id);

    } else {

        //TODO: Show warning message

    };
};

Base.prototype.upgradeMPs = function () {
    var _this_ = this;

    if (player.enoughForUpgrade(_this_.id, 'MPs')) {

        game.socket.emit('UPGRADE', 'MPs', _this_.id);

    } else {

        //TODO: Show warning message

    };
};

Base.prototype.upgradeAttackSpeed = function () {
    var _this_ = this;

    if (player.enoughForUpgrade(_this_.id, 'attackSpeed')) {

        game.socket.emit('UPGRADE', 'attackSpeed', _this_.id);

    } else {

        //TODO: Show warning message

    };
};*/



function Line (firstBase, secondBase) {
    var r = g.graphics.base.r;
    var color = "0x" +  ((firstBase.owner)
                        ? game.players[firstBase.owner].color
                        : g.graphics.line.color);

    var width = g.graphics.line.width;

    //If this set of lines is not defined, define it
    if (game.graphics.lines[firstBase.id] == undefined) {

        game.graphics.lines[firstBase.id] = {};

    };
    game.graphics.lines[firstBase.id][secondBase.id] = game.self.add.graphics(0, 0);
    game.graphics.lines[firstBase.id][secondBase.id].lineStyle(width, color);
    game.graphics.lines[firstBase.id][secondBase.id].moveTo(firstBase.pos.x + r, firstBase.pos.y + r);
    game.graphics.lines[firstBase.id][secondBase.id].lineTo((firstBase.pos.x + secondBase.pos.x) / 2 + r, (firstBase.pos.y + secondBase.pos.y) / 2 + r);
};



function Socket (serverID) {
    var socket = io('/' + serverID);

    //Network events
    //CONN [9.1] (RECEIVE) Player updates; 'PLAYERUPD', <player>
    socket.on('PLAYERUPD', function (player) {
        //console.log('PLAYERUPD', player);
        game.updatePlayers(player);

        game.increaseDataUsage(player);
    });

    //CONN [9.2] (RECEIVE) Player updates; 'PROPERTYUPD', <baseID>, <playerID>
    socket.on('PROPERTYUPD', function (baseID, playerID) {
        //console.log('PROPERTYUPD', baseID, playerID);
        game.updateProperty(baseID, playerID);

        game.increaseDataUsage(['PROPERTYUPD', baseID, playerID]);
    });

    //CONN [9.3] (RECEIVE) Player updates; 'MPUPD', <baseID>, <newMP>
    socket.on('MPUPD', function (baseID, newMP) {
        console.log('MPUPD', baseID, newMP);
        game.updateMP(baseID, newMP);

        game.increaseDataUsage(['MPUPD', baseID, newMP]);
    });

    //CONN [9] (RECEIVE) Start updating map; 'MAPUPDATE'
    socket.on('MAPUPDATE', function () {
        //Each 4 seconds, every players' base's mp is increased by (initialCost) * 0.05 * levels.MPs
        var mapUpdate = setInterval(function () {
            var length = game.map.length;

            for (var i = 0; i < length; i++) {

                if (game.map[i].owner != undefined && game.map[i].owner != null) {

                    var MPsMultiplier = game.map[i].levels.MPs + 1;
                    var increase = g.game[game.map[i].type].increase * (g.game.update.map / 1000) * MPsMultiplier; //Increase in second * num of seconds in update * levels.MPs

                    game.map[i].mp += increase;
                    
                    //Update text
                    //TODO: DOM text
                    var textPosX = game.graphics.text[i].x;
                    var textPosY = game.graphics.text[i].y;

                    game.graphics.text[i].destroy();
                    game.graphics.text[i] = game.self.add.text(textPosX, textPosY, '  ' + floor(game.map[i].mp) + '  ', g.graphics.text.style);
                    game.graphics.text[i].anchor.setTo(0.5);

                };

                if (game.map[i].owner == player.id) {

                    player.totalMP += increase; //Player's total mp increase = sum of all player's bases' mp increase

                };
            };

            if (game.graphics.attack) {

                var mouseX = game.self.input.mousePointer.x + game.self.camera.x;
                var mouseY = game.self.input.mousePointer.y + game.self.camera.y;

                //Update attackMPMeter when base's MP is increased
                game.selectModule.attackMP = floor(game.map[game.selectModule.sender].mp * 1 / Math.pow(2, game.selectModule.selectShare));
                game.graphics.attack.attackMPMeter.destroy();
                game.graphics.attack.attackMPMeter = game.self.add.text(mouseX, mouseY + 35, '-' + game.selectModule.attackMP, g.graphics.text.style);
                game.graphics.attack.attackMPMeter.anchor.setTo(0.5);

            };
        }, g.game.update.map);

        game.increaseDataUsage('MAPUPDATE');
    });

    //CONN [7] (RECEIVE) Start game for a player; 'OPENGAME', <map>, <players>, <playerID>, <startTime>
    socket.on('OPENGAME', function(map, players, currentPlayer, startTime) {
        game.init(map, players, startTime);
        player.init(currentPlayer);

        game.increaseDataUsage(['OPENGAME', map, players, currentPlayer, startTime]);
    });

    return socket;
};












//|-|_|-|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_||-|_||-|_|
//|-|_|-----------------------------------------------------------------------|-|_|
//|-|_|--------------------------| STARTUP CODE |-----------------------------|-|_|
//|-|_|-----------------------------------------------------------------------|-|_|
//|-|_|-|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_|-|_||-|_||-|_|

//----LOBBY--SOCKET----(START)
//CONN [0] (SEND) Connection to 'lobby'; 'connection', socket
var lobbyMember = io('/lobby');

//CONN [1] (RECEIVE) Server list
lobbyMember.on('SERVERLIST', function(serverList) {
    info.servers = serverList;
    UI.serverList(serverList);
});

//CONN [2] (RECEIVE) Game session start
lobbyMember.on('GAMESTART', function(serverID) {
    //
});

//CONN [3] (RECEIVE) Game session end
lobbyMember.on('GAMEEND', function(serverID) {
    //
});
//----LOBBY--SOCKET----(END)
