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
var util_1 = require("./util");
var method_editor_1 = require("./editors/method_editor");
var VisitorContext = (function (_super) {
    __extends(VisitorContext, _super);
    function VisitorContext(ast, service) {
        var _this = _super.call(this, ast.text) || this;
        _this.ast = ast;
        _this.service = service;
        _this.checker = service.getProgram().getTypeChecker();
        _this.editors = [];
        return _this;
    }
    VisitorContext.prototype.getMethodEditor = function (classNameOrNode, methodName) {
        var classNode = null;
        if (typeof classNameOrNode === "string") {
            classNode = util_1.findClassInFile(this.ast, classNameOrNode);
        }
        else {
            classNode = classNameOrNode;
        }
        var method = util_1.findMethodOnClass(classNode, methodName);
        if (method) {
            var editor = new method_editor_1.MethodEditor(this, method.getEnd() - 1, methodName, false);
            this.editors.push(editor);
            return editor;
        }
        else {
            var editor = new method_editor_1.MethodEditor(this, classNode.getEnd() - 1, methodName, true);
            this.editors.push(editor);
            return editor;
        }
    };
    VisitorContext.prototype.applyBodyMutations = function () {
        for (var i = 0; i < this.editors.length; i++) {
            this.editors[i].buildMutations();
        }
        _super.prototype.applyBodyMutations.call(this);
    };
    VisitorContext.prototype.removeNode = function (node) {
        this.remove(node.getStart(), node.getEnd());
    };
    VisitorContext.prototype.findUsages = function (node) {
        debugger;
        return this.service.getReferencesAtPosition(this.ast.fileName, node.pos);
    };
    VisitorContext.prototype.getNodeName = function (node) {
        var name = node.name;
        if (name) {
            return name.getText();
        }
        else {
            return null;
        }
    };
    return VisitorContext;
}(string_mutator_1.StringMutator));
exports.VisitorContext = VisitorContext;
