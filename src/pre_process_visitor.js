"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var string_mutator_1 = require("./string_mutator");
var PreProcessVisitor = (function () {
    function PreProcessVisitor() {
    }
    PreProcessVisitor.prototype.shouldVisitFile = function (ast) {
        return false;
    };
    PreProcessVisitor.prototype.filter = function (node) {
        return false;
    };
    PreProcessVisitor.prototype.beforeVisit = function (ast, context) { };
    PreProcessVisitor.prototype.visit = function (node, context) { };
    PreProcessVisitor.prototype.afterVisit = function (ast, context) { };
    return PreProcessVisitor;
}());
exports.PreProcessVisitor = PreProcessVisitor;
var PreProcessVisitorContext = (function (_super) {
    __extends(PreProcessVisitorContext, _super);
    function PreProcessVisitorContext(ast) {
        var _this = _super.call(this, ast.text) || this;
        _this.ast = ast;
        return _this;
    }
    return PreProcessVisitorContext;
}(string_mutator_1.StringMutator));
exports.PreProcessVisitorContext = PreProcessVisitorContext;
