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
var ts = require("typescript");
var visitor_1 = require("./visitor");
var util_1 = require("./util");
var DecoratorVisitor = (function (_super) {
    __extends(DecoratorVisitor, _super);
    function DecoratorVisitor(mutators) {
        var _this = _super.call(this) || this;
        _this.mutators = mutators;
        return _this;
    }
    DecoratorVisitor.prototype.shouldVisitFile = function (ast) {
        return true;
    };
    DecoratorVisitor.prototype.filter = function (node) {
        return node.kind === ts.SyntaxKind.ClassDeclaration;
    };
    DecoratorVisitor.prototype.visit = function (node, context) {
        var _this = this;
        var classDeclaration = node;
        var methods = util_1.getMethodMembers(classDeclaration);
        var decoratedMethods = methods.filter(function (method) { return method.decorators; });
        decoratedMethods.forEach(function (m) { return _this.applyMutators(context, classDeclaration, m); });
    };
    DecoratorVisitor.prototype.applyMutators = function (context, classDeclaration, method) {
        var _loop_1 = function (i) {
            var mutator = this_1.mutators[i];
            method.decorators.forEach(function (decorator) {
                if (mutator.test(classDeclaration, method, decorator)) {
                    mutator.mutate(context, classDeclaration, method, decorator);
                }
            });
        };
        var this_1 = this;
        for (var i = 0; i < this.mutators.length; i++) {
            _loop_1(i);
        }
    };
    return DecoratorVisitor;
}(visitor_1.Visitor));
exports.DecoratorVisitor = DecoratorVisitor;
