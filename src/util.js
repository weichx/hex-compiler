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
function getDeclarationFlags(classElement) {
    var modifierFlags = ts.getCombinedModifierFlags(classElement);
    var isStatic = (modifierFlags & ts.ModifierFlags.Static) !== 0;
    var isPublic = (modifierFlags & ts.ModifierFlags.Public) !== 0;
    var isProtected = (modifierFlags & ts.ModifierFlags.Protected) !== 0;
    var isPrivate = (modifierFlags & ts.ModifierFlags.Private) !== 0;
    var isReadonly = (modifierFlags & ts.ModifierFlags.Readonly) !== 0;
    var isAsync = (modifierFlags & ts.ModifierFlags.Async) !== 0;
    var isAbstract = (modifierFlags & ts.ModifierFlags.Abstract) !== 0;
    return {
        isStatic: isStatic,
        isPublic: isPublic,
        isPrivate: isPrivate,
        isProtected: isProtected,
        isReadonly: isReadonly,
        isAsync: isAsync,
        isAbstract: isAbstract
    };
}
exports.getDeclarationFlags = getDeclarationFlags;
function getFullTypeName(type) {
    var node = type.symbol.valueDeclaration;
    if (!node)
        return null;
    var name = [];
    while (node) {
        if (node.name)
            name.push(node.name.getText());
        node = node.parent;
    }
    return name.reverse().join(".");
}
exports.getFullTypeName = getFullTypeName;
function getTypeLocation(type) {
    var file = getDeclaredFile(type);
    var name = getFullTypeName(type);
    return file + ":" + name;
}
exports.getTypeLocation = getTypeLocation;
function getTypeId(type) {
    var typeName = getFullTypeName(type);
    if (!typeName)
        return -1;
    return getHashCode(typeName);
}
exports.getTypeId = getTypeId;
function getBaseClass(type) {
    var baseTypes = type.getBaseTypes();
    if (baseTypes.length === 0) {
        return null;
    }
    return baseTypes[0];
}
exports.getBaseClass = getBaseClass;
//todo not working
function getFullTypeHierarchy(type) {
    var baseTypes = type.getBaseTypes();
    if (baseTypes.length === 0) {
        return null;
    }
    //const baseHierarchy = getFullTypeHierarchy(baseTypes[0]);
    var baseProps = baseTypes[0].getProperties();
    var props = type.getProperties();
    var outProps = [];
    for (var i = 0; i < props.length; i++) {
        var prop = props[i];
        var name_1 = prop.getName();
        var found = false;
        for (var j = 0; j < baseProps.length; j++) {
            var baseProp = baseProps[j];
            if (baseProp.getName() === name_1) {
                found = true;
                break;
            }
        }
        if (!found) {
            outProps.push(prop);
        }
        found = false;
    }
    return outProps; //null;
}
exports.getFullTypeHierarchy = getFullTypeHierarchy;
function getOwnProperties(type) {
    var baseTypes = type.getBaseTypes();
    if (baseTypes.length === 0) {
        return type.getProperties();
    }
    var baseProps = baseTypes[0].getProperties();
    var props = type.getProperties();
    var outProps = [];
    for (var i = 0; i < props.length; i++) {
        var prop = props[i];
        var name_2 = prop.getName();
        var found = false;
        for (var j = 0; j < baseProps.length; j++) {
            var baseProp = baseProps[j];
            if (baseProp.getName() === name_2) {
                found = true;
                break;
            }
        }
        if (!found) {
            outProps.push(prop);
        }
        found = false;
    }
    return outProps;
}
exports.getOwnProperties = getOwnProperties;
function getOwnFields(type) {
    return getOwnProperties(type).filter(function (p) { return (p.flags & ts.SymbolFlags.Property) !== 0; });
}
exports.getOwnFields = getOwnFields;
function getOwnMethods(type) {
    return getOwnProperties(type).filter(function (p) { return (p.flags & ts.SymbolFlags.Method) !== 0; });
}
exports.getOwnMethods = getOwnMethods;
//todo make relative to project root
function getDeclaredFile(type) {
    try {
        return type.symbol.valueDeclaration.getSourceFile().fileName;
    }
    catch (e) {
        return null;
    }
}
exports.getDeclaredFile = getDeclaredFile;
function isInterface(type) {
    return (type.symbol.flags & ts.SymbolFlags.Interface) !== 0;
}
exports.isInterface = isInterface;
function isClass(type) {
    return (type.symbol.flags & ts.SymbolFlags.Class) !== 0;
}
exports.isClass = isClass;
function isPropertyInherited(type, propertyName, propertyTypeId) {
    // const baseType = type.getBaseTypes();
    // if (!baseType || baseType.length === 0) {
    //     return false;
    // }
    // const data = types.get(getTypeId(baseType[0] as ts.Type));
    // if (!data || !data.properties) return false;
    // const parentPropTypeId = data.properties[propertyName];
    // if (parentPropTypeId) {
    //     return parentPropTypeId === propertyTypeId;
    // }
    // return false;
}
exports.isPropertyInherited = isPropertyInherited;
function getHashCode(input) {
    var hash = 0;
    if (input.length === 0)
        return hash;
    for (var i = 0; i < input.length; i++) {
        var chr = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    return hash;
}
function isStatement(node) {
    return node.kind === ts.SyntaxKind.VariableStatement ||
        node.kind === ts.SyntaxKind.ReturnStatement ||
        node.kind === ts.SyntaxKind.ExpressionStatement ||
        node.kind === ts.SyntaxKind.IfStatement ||
        node.kind === ts.SyntaxKind.WhileStatement ||
        node.kind === ts.SyntaxKind.ForInStatement ||
        node.kind === ts.SyntaxKind.ForOfStatement ||
        node.kind === ts.SyntaxKind.DoStatement ||
        node.kind === ts.SyntaxKind.SwitchStatement ||
        node.kind === ts.SyntaxKind.ThrowKeyword ||
        node.kind === ts.SyntaxKind.TryStatement ||
        node.kind === ts.SyntaxKind.WithStatement;
}
exports.isStatement = isStatement;
function getParentStatement(node) {
    var ptr = node.parent;
    while (ptr && !isStatement(ptr)) {
        ptr = ptr.parent;
    }
    return ptr;
}
exports.getParentStatement = getParentStatement;
function getSyntaxKind(node) {
    return ts.SyntaxKind[node.kind];
}
exports.getSyntaxKind = getSyntaxKind;
function isBlockLike(node) {
    return node.kind === ts.SyntaxKind.SourceFile ||
        node.kind === ts.SyntaxKind.Block ||
        node.kind === ts.SyntaxKind.ModuleBlock ||
        node.kind === ts.SyntaxKind.CaseBlock ||
        node.kind === ts.SyntaxKind.DefaultClause;
}
exports.isBlockLike = isBlockLike;
function getContainingBlock(node) {
    var ptr = node.parent;
    while (ptr && !isBlockLike(ptr)) {
        ptr = ptr.parent;
    }
    return ptr;
}
exports.getContainingBlock = getContainingBlock;
function getParentNodeOfKind(node, kind) {
    var p = node.parent;
    while (p && p.kind !== kind) {
        p = p.parent;
    }
    return p;
}
exports.getParentNodeOfKind = getParentNodeOfKind;
function getChildNodeOfKind(node, kind) {
    var children = node.getChildren();
    for (var i = 0; i < children.length; i++) {
        if (children[i].kind === kind) {
            return children[i];
        }
    }
    return null;
}
exports.getChildNodeOfKind = getChildNodeOfKind;
function isChildNode(node, childTest) {
    var children = node.getChildren();
    for (var i = 0; i < children.length; i++) {
        if (children[i] === childTest) {
            return true;
        }
    }
    return false;
}
exports.isChildNode = isChildNode;
function isConst(variableStatement) {
    var constKeywordKind = variableStatement.declarationList.getChildAt(0).kind;
    return (constKeywordKind === ts.SyntaxKind.ConstKeyword);
}
exports.isConst = isConst;
function getGenericFunctionArguments(callExpression) {
    return callExpression.typeArguments;
}
exports.getGenericFunctionArguments = getGenericFunctionArguments;
function getVariableIdentifier(variableStatement) {
    var child2 = variableStatement.declarationList.getChildAt(1);
    var syntaxList = child2.getChildAt(0);
    return syntaxList.getChildAt(0);
}
exports.getVariableIdentifier = getVariableIdentifier;
function getAssignedExpression(variableStatement) {
    var child2 = variableStatement.declarationList.getChildAt(1);
    var syntaxList = child2.getChildAt(0);
    return syntaxList.getChildAt(2);
}
exports.getAssignedExpression = getAssignedExpression;
function makeVariableName(prefix) {
    if (prefix === void 0) { prefix = ""; }
    return "_$_" + prefix + (Math.random() * 99999 | 0).toString();
}
exports.makeVariableName = makeVariableName;
function findAllDescendantsOfTypeWithName(node, kind, name) {
    if (node.getText().indexOf(name) === -1)
        return [];
    var out = new Array();
    function recurse(child) {
        if (child.kind === kind && child.getText() === name) {
            out.push(child);
        }
        ts.forEachChild(child, recurse);
    }
    recurse(node);
    return out;
}
exports.findAllDescendantsOfTypeWithName = findAllDescendantsOfTypeWithName;
