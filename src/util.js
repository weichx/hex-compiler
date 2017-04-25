"use strict";
exports.__esModule = true;
var ts = require("typescript");
function getMethodMembers(node) {
    var retn = new Array();
    var members = node.members;
    for (var i = 0; i < members.length; i++) {
        if (members[i].kind === ts.SyntaxKind.MethodDeclaration) {
            retn.push(members[i]);
        }
    }
    return retn;
}
exports.getMethodMembers = getMethodMembers;
function findClassInFile(ast, className) {
    var node = null;
    if (ast.kind === ts.SyntaxKind.ClassDeclaration) {
        if (ast.name.getText() === className) {
            return ast;
        }
    }
    ts.forEachChild(ast, function (child) {
        if (!node) {
            node = findClassInFile(child, className);
        }
    });
    return node;
}
exports.findClassInFile = findClassInFile;
function findMethodOnClass(startNode, methodName) {
    var members = startNode.members;
    for (var i = 0; i < members.length; i++) {
        if (members[i].kind === ts.SyntaxKind.MethodDeclaration) {
            if (members[i].name.getText() === methodName) {
                return members[i];
            }
        }
    }
    return null;
}
exports.findMethodOnClass = findMethodOnClass;
