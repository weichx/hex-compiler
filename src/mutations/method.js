"use strict";
exports.__esModule = true;
var util_1 = require("../util");
var AppendToOrCreatePrototypeMethod = (function () {
    function AppendToOrCreatePrototypeMethod(className, methodName, methodBody) {
        this.className = className;
        this.methodName = methodName;
        this.methodBody = methodBody;
    }
    AppendToOrCreatePrototypeMethod.prototype.apply = function (context) {
        var classNode = util_1.findClassInFile(context.ast, this.className);
        if (classNode) {
            var methodNode = util_1.findMethodOnClass(classNode, this.methodName);
            if (methodNode) {
                context.insertLine(methodNode.getEnd(), this.methodBody);
            }
        }
    };
    return AppendToOrCreatePrototypeMethod;
}());
exports.AppendToOrCreatePrototypeMethod = AppendToOrCreatePrototypeMethod;
