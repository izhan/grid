var util = require('@grid/util');

module.exports = (function (_grid) {
    var grid = _grid;
    var model = {row: 0, col: 0};

    model.scrollTo = function (r, c) {
        var maxRow = grid.rowModel.length() - 1;
        var maxCol = grid.colModel.length() - 1;
        model.row = util.clamp(r, 0, maxRow);
        model.col = util.clamp(c, 0, maxCol);
    };
    return model;
})