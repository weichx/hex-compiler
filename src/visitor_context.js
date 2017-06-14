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
var string_mutator_1 = require("./string_mutator");
var util_1 = require("./util");
var method_editor_1 = require("./editors/method_editor");
var util = require("./util");
var VisitorContext = (function (_super) {
    __extends(VisitorContext, _super);
    function VisitorContext(ast, service) {
        var _this = _super.call(this, ast.text) || this;
        _this.util = util;
        _this.ts = ts;
        _this.ast = ast;
        _this.service = service;
        _this.checker = service.getProgram().getTypeChecker();
        _this.editors = [];
        return _this;
    }
    VisitorContext.prototype.getMethodEditor = function (classNameOrNode, methodName) {
        var classNode = null;
        var className = null;
        if (typeof classNameOrNode === "string") {
            classNode = util_1.findClassInFile(this.ast, classNameOrNode);
            className = classNameOrNode;
        }
        else {
            classNode = classNameOrNode;
            className = classNode.name.getText();
        }
        for (var i = 0; i < this.editors.length; i++) {
            if (this.editors[i].className === className && this.editors[i].methodName === methodName) {
                return this.editors[i];
            }
        }
        var method = util_1.findMethodOnClass(classNode, methodName);
        if (method) {
            var editor = new method_editor_1.MethodEditor(this, method.getEnd() - 1, className, methodName, false);
            this.editors.push(editor);
            return editor;
        }
        else {
            var editor = new method_editor_1.MethodEditor(this, classNode.getEnd() - 1, className, methodName, true);
            this.editors.push(editor);
            return editor;
        }
    };
    VisitorContext.prototype.inject = function (classDeclaration, propertyDef) {
        this.insertLine(classDeclaration.getEnd() - 1, propertyDef);
    };
    // public isInheritedMethod(classNameOrNode : string|ts.ClassDeclaration, methodName : string) {
    //     let classNode : ts.ClassDeclaration = null;
    //     if (typeof classNameOrNode === "string") {
    //         classNode = findClassInFile(this.ast, classNameOrNode);
    //     }
    //     else {
    //         classNode = classNameOrNode as ts.ClassDeclaration;
    //     }
    //     const type = this.checker.getTypeAtLocation(classNode);
    //     if(!type) return false;
    //     // type.getBaseTypes()[0].
    //     return true;
    // }
    VisitorContext.prototype.applyBodyMutations = function () {
        for (var i = 0; i < this.editors.length; i++) {
            this.editors[i].buildMutations();
        }
        _super.prototype.applyBodyMutations.call(this);
    };
    VisitorContext.prototype.removeNode = function (node) {
        this.remove(node.getStart(), node.getEnd());
    };
    VisitorContext.prototype.replaceNode = function (node, text) {
        this.replace(node.getStart(), node.getEnd(), text);
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
