module.exports = {
    floor:          function (value) {
        return value >>> 0;
    },

    abs:            function (value) {
        return (value ^ (value >> 31)) - (value >> 31);
    },

    pow2:           function (value) {
        return value * value;
    },

    randFromTo:     function (from, to) {
        return Math.floor(Math.random() * (to - from)) + from;
    },

    randomColor:    function () {
        return '' + ((1<<24)*Math.random()|0).toString(16);
    },
};

module.exports.distance = function (pos1, pos2) {
    return module.exports.floor(Math.sqrt(module.exports.pow2(pos1.x - pos2.x) + module.exports.pow2(pos1.y - pos2.y)));
};
