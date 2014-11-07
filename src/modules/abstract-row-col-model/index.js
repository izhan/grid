var addDirtyProps = require('@grid/add-dirty-props');
var util = require('@grid/util');
var noop = require('@grid/no-op');

module.exports = function (_grid, name, lengthName, defaultLength) {
    var grid = _grid;

    var DEFAULT_LENGTH = defaultLength;
    var descriptors = [];
    var numFixed = 0;
    var numHeaders = 0;
    var makeDirtyClean = require('@grid/dirty-clean');
    var dirtyClean = makeDirtyClean(grid);
    var builderDirtyClean = makeDirtyClean(grid);
    var selected = [];

    function setDescriptorsDirty() {
        grid.eventLoop.fire('grid-' + name + '-change');
        dirtyClean.setDirty();
        builderDirtyClean.setDirty();
    }

    function fireSelectionChange() {
        grid.eventLoop.fire('grid-' + name + '-selection-change');
    }

    var api = {
        areBuildersDirty: builderDirtyClean.isDirty,
        isDirty: dirtyClean.isDirty,
        add: function (toAdd) {
            if (!util.isArray(toAdd)) {
                toAdd = [toAdd];
            }
            toAdd.forEach(function (descriptor) {
                if (descriptor.header) {
                    descriptors.splice(numHeaders, 0, descriptor);
                    numFixed++;
                    numHeaders++;
                }

                else {
                    //if the column is fixed and the last one added is fixed (we only allow fixed at the beginning for now)
                    if (descriptor.fixed) {
                        if (!descriptors.length || descriptors[descriptors.length - 1].fixed) {
                            numFixed++;
                        } else {
                            throw 'Cannot add a fixed column after an unfixed one';
                        }
                    }
                    descriptors.push(descriptor);
                }
            });

            setDescriptorsDirty();
        },
        addHeaders: function (toAdd) {
            if (!util.isArray(toAdd)) {
                toAdd = [toAdd];
            }
            toAdd.forEach(function (header) {
                header.header = true;
            });
            api.add(toAdd);
        },
        header: function (index) {
            return descriptors[index];
        },
        get: function (index) {
            return descriptors[index];
        },
        length: function (includeHeaders) {
            var subtract = includeHeaders ? 0 : numHeaders;
            return descriptors.length - subtract;
        },
        remove: function (descriptor) {
            var index = descriptors.indexOf(descriptor);
            if (index !== -1) {
                descriptors.splice(index, 1);
                if (descriptor.header) {
                    numFixed--;
                    numHeaders--;
                } else if (descriptor.fixed) {
                    numFixed--;
                }
            }
        },
        clear: function (includeHeaders) {
            descriptors.slice(0).forEach(function (descriptor) {
                if (includeHeaders || !descriptor.header) {
                    api.remove(descriptor);
                }
            });
        },
        move: function (start, target) {
            descriptors.splice(target, 0, descriptors.splice(start, 1)[0]);
            setDescriptorsDirty();
        },
        numHeaders: function () {
            return numHeaders;
        },
        numFixed: function () {
            return numFixed;
        },
        toVirtual: function (dataIndex) {
            return dataIndex + api.numHeaders();
        },
        toData: function (virtualIndex) {
            return virtualIndex - api.numHeaders();
        },

        select: function (index) {

            var descriptor = api[name](index);
            if (!descriptor.selected) {
                descriptor.selected = true;
                selected.push(index);
                fireSelectionChange();
            }
        },
        deselect: function (index, dontNotify) {
            var descriptor = api[name](index);
            if (descriptor.selected) {
                descriptor.selected = false;
                selected.splice(selected.indexOf(index), 1);
                if (!dontNotify) {
                    fireSelectionChange();
                }
            }
        },
        toggleSelect: function (index) {
            var descriptor = api[name](index);
            if (descriptor.selected) {
                api.deselect(index);
            } else {
                api.select(index);
            }
        },
        clearSelected: function () {
            var length = selected.length;
            selected.slice(0).forEach(function (index) {
                api.deselect(index, true);
            });
            if (length) {
                fireSelectionChange();
            }
        },
        getSelected: function () {
            return selected;
        },
        create: function (builder) {
            var descriptor = {};
            var fixed = false;
            Object.defineProperty(descriptor, 'fixed', {
                enumerable: true,
                get: function () {
                    return descriptor.header || fixed;
                },
                set: function (_fixed) {
                    fixed = _fixed;
                }
            });

            addDirtyProps(descriptor, ['builder'], [builderDirtyClean]);
            descriptor.builder = builder;

            return addDirtyProps(descriptor, [
                {
                    name: lengthName,
                    onDirty: function () {
                        grid.eventLoop.fire('grid-' + name + '-change');
                    }
                }
            ], [dirtyClean]);
        },
        createBuilder: function (render, update) {
            return {render: render || noop, update: update || noop};
        }
    };

    //basically height or width
    api[lengthName] = function (index) {
        if (!descriptors[index]) {
            return NaN;
        }

        return descriptors[index] && descriptors[index][lengthName] || DEFAULT_LENGTH;
    };

    //row or col get
    api[name] = function (index) {
        return descriptors[index + numHeaders];
    };

    return api;
};