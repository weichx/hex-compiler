"use strict";
exports.__esModule = true;
var MethodEditor = (function () {
    function MethodEditor(context, start, className, methodName, isCreating) {
        this.context = context;
        this.start = start;
        this.className = className;
        this.methodName = methodName;
        this.statementList = [];
        this.isCreating = isCreating;
        if (isCreating) {
            this.statementList.push("public " + methodName + "() : void {\n");
        }
    }
    MethodEditor.prototype.addStatement = function (statement) {
        this.statementList.push(statement);
    };
    MethodEditor.prototype.buildMutations = function () {
        if (this.isCreating) {
            this.statementList.push("\n}\n");
        }
        this.context.insert(this.start, this.statementList.join(""));
    };
    return MethodEditor;
}());
exports.MethodEditor = MethodEditor;
