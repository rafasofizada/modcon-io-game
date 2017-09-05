<div class="column beta-shop">

    <div class="beta-shop-header">

        <p class="beta-shop-header-text">Shop</p>

        <div class="beta-shop-stat">₼420</div>

    </div>

    <ul class="beta-shop-offers">

        <li class="beta-shop-offer beta-shop-offer-special">

            <p class="inline">Get free ₼ coins!</p><div class="inline beta-offer-special-icon"></div>

        </li>

        <li class="beta-shop-offer">

            <p class="inline offer-text">₼100 pack</p>

            <div class="beta-shop-offer-button">

                <p class="inline offer-buy">BUY</p><p class="inline offer-price">$0.99</p>

            </div>

        </li>

        <li class="beta-shop-offer">

            <p class="inline offer-text">₼500 pack + <span class="offer-special-unit">2 upgrades!</span></p>

            <div class="beta-shop-offer-button">

                <p class="inline offer-buy">BUY</p><p class="inline offer-price">$3.99</p>

            </div>

        </li>

        <li class="beta-shop-offer">

            <p class="inline offer-text">₼1000 pack + <span class="offer-special-unit">5 upgrades!</span></p>

            <div class="beta-shop-offer-button">

                <p class="inline offer-buy">BUY</p><p class="inline offer-price">$6.99</p>

            </div>

        </li>

        <li class="beta-shop-offer">

            <p class="inline offer-text">₼2500 pack + <span class="offer-special-unit">11 upgrades!</span></p>

            <div class="beta-shop-offer-button">

                <p class="inline offer-buy">BUY</p><p class="inline offer-price">$10.99</p>

            </div>

        </li>

    </ul>

    <div class="beta-shop-header upgrade">

        <p class="beta-shop-header-text">Upgrades</p>

    </div>

    <div class="data-container upgrade-container">



    </div>

</div>

function Base (proto, player) {
    var id = proto.id;
    var type = proto.type;
    var lvl = proto.lvl;
    var mp = proto.mp;

    var color = '0x' + shadeColor(g.graphics.base.color, 20);

    //Set prototype base's color
    proto.color = lineColor;
    proto.belongs = (player ? player.id : undefined);

    var sqrt2 = Math.sqrt(2);
    var startAngle = 0;

    var x = proto.pos.x;
    var y = proto.pos.y;
    var r = g.graphics.base.r;
    var R = g.graphics.base.R;
    var A = 2*r / (1 + sqrt2);
    var a = A / sqrt2;


    var textPosX = Math.floor(x + r);
    var textPosY = Math.floor(y + 3*r);

    //Add base body (hexagon)
    //https://phaser.io/examples/v2/geometry/polygon-contains
    var points = [];
    //Collection of polygon points
    if (type === 'ground') { //octagon

        points = [
            new Phaser.Point(x + a, y),
            new Phaser.Point(x + a + A, y),
            new Phaser.Point(x + 2*r, y + a),
            new Phaser.Point(x + 2*r, y + a + A),
            new Phaser.Point(x + a + A, y + 2*r),
            new Phaser.Point(x + a, y + 2*r),
            new Phaser.Point(x, y + a + A),
            new Phaser.Point(x, y + a),
        ];

    } else if (type === 'air') { //square

        var padding = 0.15*r;
        points = [
            //Padding 0.2*r
            new Phaser.Point(x + padding, y + padding),
            new Phaser.Point(x + 2*r - padding, y + padding),
            new Phaser.Point(x + 2*r - padding, y + 2*r - padding),
            new Phaser.Point(x + padding, y + 2*r - padding),
        ];

    } else if (type === 'rocket') { //triangle

        points = [
            new Phaser.Point(x + r, y),
            new Phaser.Point(x + 2*r, y + r * Math.sqrt(3)),
            new Phaser.Point(x, y + r * Math.sqrt(3)),
        ];

    };

    var poly = new Phaser.Polygon(points);

    if (game.graphics.bases[id]) {
        game.graphics.bases[id].destroy();
    };
    game.graphics.bases[id] = game.self.add.graphics(0, 0);

    game.graphics.bases[id].beginFill(color); //Lighter color
    game.graphics.bases[id].lineStyle(lineWidth, lineColor, 1);
    game.graphics.bases[id].drawPolygon(poly.points);
    game.graphics.bases[id].endFill();

    //Event listeners
    game.graphics.bases[id].inputEnabled = true;
    game.graphics.bases[id].input.useHandCursor = true;
    game.graphics.bases[id].events.onInputDown.add(function() {
        //TODO: UI Dialog
    });

    return proto;
};
