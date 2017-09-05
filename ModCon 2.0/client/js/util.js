function floor (value) {
    return value >>> 0;
};

function abs (value) {
    return (value ^ (value >> 31)) - (value >> 31);
};

function pow2 (value) {
    return value * value;
};

function randFromTo (from, to) {
    return Math.floor(Math.random() * (to - from)) + from;
};

function randomColor () {
    return '' + ((1<<24)*Math.random()|0).toString(16);
};

function distance (pos1, pos2) {
    return floor(Math.sqrt(pow2(pos1.x - pos2.x) + pow2(pos1.y - pos2.y)));
};

function degree (pos1, pos2) {
    return Math.atan2(pos2.y - pos1.y, pos2.x - pos1.x) * 180 / Math.PI;
};

//https://stackoverflow.com/questions/1248302/javascript-object-size
function roughSizeOfObject (object) {

    var objectList = [];
    var stack = [object];
    var bytes = 0;

    while (stack.length) {
        var value = stack.pop();

        if (typeof value === 'boolean') {

            bytes += 4;

        } else if (typeof value === 'string') {

            bytes += value.length * 2;

        } else if (typeof value === 'number') {

            bytes += 8;

        } else if (typeof value === 'object' && objectList.indexOf(value) === -1) {

            objectList.push( value );

            for(var i in value) {
                stack.push(value[i]);
            };

        };
    };

    return bytes;
};
