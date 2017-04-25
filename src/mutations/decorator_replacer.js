"use strict";
exports.__esModule = true;
var DecoratorReplacer = (function () {
    function DecoratorReplacer(classNode) {
        this.classNode = classNode;
    }
    DecoratorReplacer.prototype.test = function (method, decorator) {
        return false;
    };
    DecoratorReplacer.prototype.applyReplacement = function (context, decorator) {
    };
    return DecoratorReplacer;
}());
exports.DecoratorReplacer = DecoratorReplacer;
