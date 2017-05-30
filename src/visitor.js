"use strict";
exports.__esModule = true;
var Visitor = (function () {
    function Visitor() {
    }
    Visitor.prototype.shouldVisitFile = function (ast) {
        return true;
    };
    Visitor.prototype.filter = function (node) {
        return false;
    };
    Visitor.prototype.beforeVisit = function (ast, context) { };
    Visitor.prototype.visit = function (node, context) { };
    Visitor.prototype.afterVisit = function (ast, context) { };
    return Visitor;
}());
exports.Visitor = Visitor;
