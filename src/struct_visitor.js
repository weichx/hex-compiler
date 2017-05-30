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
var structPropertyMap = new Map();
var StructData = (function () {
    function StructData(identifier, tableName, offsetValue) {
        this.didDeclare = false;
        this.identifier = identifier;
        this.tableName = tableName;
        this.offsetName = util_1.makeVariableName();
        this.offsetValue = offsetValue;
        this.typeName = "";
        this.properties = [];
    }
    StructData.prototype.getProperty = function (name) {
        for (var i = 0; i < this.properties.length; i++) {
            if (this.properties[i].name === name) {
                return this.properties[i];
            }
        }
        return null;
    };
    StructData.prototype.getPropertyIndex = function (name) {
        for (var i = 0; i < this.properties.length; i++) {
            if (this.properties[i].name === name) {
                return this.properties[i].row;
            }
        }
        return -1;
    };
    StructData.prototype.getPropertyOffset = function (name) {
        for (var i = 0; i < this.properties.length; i++) {
            if (this.properties[i].name === name) {
                return this.properties[i].offset;
            }
        }
        return 0;
    };
    return StructData;
}());
var StructProperty = (function () {
    function StructProperty() {
        this.name = null;
        this.offset = 0;
        this.row = 0;
        this.size = 0;
        this.isPacked = false;
    }
    return StructProperty;
}());
function isStructConstructorFn(node) {
    var isCall = node.kind === ts.SyntaxKind.CallExpression;
    return (isCall && node.getText().indexOf("__inline_struct") !== -1);
}
function processCallExpression(callNode, context) {
    if (!isStructConstructorFn(callNode)) {
        return;
    }
    var parentStatement = util_1.getParentStatement(callNode);
    if (parentStatement.kind !== ts.SyntaxKind.VariableStatement) {
        return;
    }
    if (!util_1.isConst(parentStatement)) {
        return;
    }
    var identifier = util_1.getVariableIdentifier(parentStatement);
    var callExpression = util_1.getAssignedExpression(parentStatement);
    var structData = extractStructConstructorData(identifier, callExpression, context.checker);
    var block = util_1.getContainingBlock(callNode);
    var usages = getIdentifierUsageInBlock(block, identifier);
    for (var i = 0; i < usages.length; i++) {
        generateCode(usages[i], structData, context);
    }
}
function isStruct(type) {
    var baseTypes = type.getBaseTypes();
    return baseTypes.length === 1;
}
function assignRowsAndOffsets(properties) {
    var allocated = 0;
    var currentRow = 0;
    for (var i = 0; i < properties.length; i++) {
        var property = properties[i];
        if (property.size === 32) {
            property.isPacked = false;
        }
        if (allocated + property.size > 32) {
            allocated = 0;
            currentRow++;
        }
        property.row = currentRow;
        property.offset = allocated;
        allocated += property.size;
    }
    for (var i = 1; i < properties.length - 1; i++) {
        //if next property is on same row -> pack
        //if prev property is on same row -> pack
        var current = properties[i];
        var previous = properties[i - 1];
        var next = properties[i + 1];
        if (current.row === previous.row) {
            current.isPacked = true;
            previous.isPacked = true;
        }
        if (current.row === next.row) {
            current.isPacked = true;
            next.isPacked = true;
        }
    }
}
function getPackSize(str) {
    var split = str.split(":");
    str = split[1];
    if (str.indexOf("u24") !== -1) {
        return 24;
    }
    else if (str.indexOf("u16") !== -1) {
        return 16;
    }
    else if (str.indexOf("u8") !== -1) {
        return 8;
    }
    else if (str.indexOf("u4") !== -1) {
        return 4;
    }
    else if (str.indexOf("u1") !== -1) {
        return 1;
    }
    else {
        return 32;
    }
}
function extractStructConstructorData(identifier, callExpression, checker) {
    var tableName = callExpression.arguments[0].getText();
    var offsetValue = callExpression.arguments[1].getText();
    var type = checker.getTypeAtLocation(callExpression.typeArguments[0]);
    var data = new StructData(identifier, tableName, offsetValue);
    if (!isStruct(type)) {
        console.error(type.symbol.name, "is not a valid struct. Must extend Struct & only Struct");
    }
    data.properties = createProperties(type);
    data.typeName = type.symbol.name;
    return data;
}
function createProperties(type) {
    var cached = structPropertyMap.get(type.symbol.name);
    if (cached) {
        return cached;
    }
    var typeProperties = type.getApparentProperties().filter(function (p) {
        return p.getName() !== "__struct_type_check__" && p.getName() !== "size";
    });
    var properties = new Array();
    var allocated = 0;
    var currentRow = 0;
    for (var i = 0; i < typeProperties.length; i++) {
        var propertyText = typeProperties[i].valueDeclaration.getText();
        var input = new StructProperty();
        input.name = typeProperties[i].getName();
        input.size = getPackSize(propertyText);
        if (allocated + input.size > 32) {
            allocated = 0;
            currentRow++;
        }
        input.offset = allocated;
        input.row = currentRow;
        properties.push(input);
        allocated += input.size;
    }
    for (var i = 1; i < properties.length - 1; i++) {
        //if next property is on same row -> pack
        //if prev property is on same row -> pack
        var current = properties[i];
        var previous = properties[i - 1];
        var next = properties[i + 1];
        if (current.row === previous.row) {
            current.isPacked = true;
            previous.isPacked = true;
        }
        if (current.row === next.row) {
            current.isPacked = true;
            next.isPacked = true;
        }
    }
    structPropertyMap.set(type.symbol.name, properties);
    return properties;
}
function getIdentifiers(n, idName, output) {
    var count = 0;
    n.getChildren().forEach(function (c) {
        if (c.kind === ts.SyntaxKind.Identifier) {
            if (c.text === idName) {
                //todo -- if parent is assignment && this is on the id side of that, bail
                //out of block
                count++;
                output.push(c);
            }
        }
        else {
            count += getIdentifiers(c, idName, output);
        }
    });
    return count;
}
function getIdentifierUsageInBlock(block, id) {
    var locations = new Array();
    block.statements.forEach(function (statement) {
        getIdentifiers(statement, id.text, locations);
    });
    return locations;
}
var StructVisitor = (function (_super) {
    __extends(StructVisitor, _super);
    function StructVisitor() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    StructVisitor.prototype.shouldVisitFile = function (ast) {
        return !ast.isDeclarationFile;
    };
    StructVisitor.prototype.filter = function (node) {
        return true;
    };
    StructVisitor.prototype.visit = function (node, context) {
        var _this = this;
        if (node.kind === ts.SyntaxKind.CallExpression) {
            processCallExpression(node, context);
        }
        ts.forEachChild(node, function (childNode) {
            _this.visit(childNode, context);
        });
    };
    return StructVisitor;
}(visitor_1.Visitor));
exports.StructVisitor = StructVisitor;
function generateCode(identifier, data, context) {
    var parent = identifier.parent;
    switch (parent.kind) {
        case ts.SyntaxKind.VariableDeclaration:
            var removedNode = util_1.getParentNodeOfKind(parent, ts.SyntaxKind.VariableStatement);
            if (data.didDeclare) {
                console.error("Looks like you are reclaring a variable with the same name as struct: " + data.identifier.getText() +
                    ", that isn't supported yet, make sure your variables are in different lexical scopes. " +
                    parent.getSourceFile().fileName + " (" + removedNode.getText() + ")");
            }
            else {
                context.removeNode(removedNode);
                context.insertOnNewLine(removedNode.getEnd(), "const " + data.offsetName + " = " + data.offsetValue + ";");
                data.didDeclare = true;
            }
            break;
        case ts.SyntaxKind.VariableStatement:
            break;
        case ts.SyntaxKind.PropertyAccessExpression:
            var accessExpression = parent;
            var accessedProperty = accessExpression.name.getText();
            if (accessedProperty === "size") {
                context.replace(parent.getStart(), parent.getEnd(), (data.properties.length - 1).toString());
                return;
            }
            var property = data.getProperty(accessedProperty);
            var tableName = "" + data.tableName;
            var ref = tableName + "[" + data.offsetName;
            ref += property.row === 0 ? "]" : " + " + property.row + "]";
            var variableStatement = util_1.getParentNodeOfKind(accessExpression, ts.SyntaxKind.VariableStatement);
            var code = ref;
            if (variableStatement && property.isPacked) {
                code = genOffsetGetter("" + ref, property);
            }
            else {
                var bin = util_1.getParentNodeOfKind(identifier, ts.SyntaxKind.BinaryExpression);
                if (bin) {
                    if (util_1.isChildNode(bin.left, identifier)) {
                        var right = bin.right.getText();
                        context.removeNode(bin.operatorToken);
                        context.removeNode(bin.right);
                        code = ref + " = " + genOffsetSetter(ref, "(" + right + " | 0)", property);
                    }
                    else if (util_1.isChildNode(bin.right, identifier)) {
                        var left = bin.left.getText();
                        context.removeNode(bin.operatorToken);
                        context.removeNode(bin.left);
                        code = left + " = " + genOffsetGetter("" + ref, property);
                    }
                }
            }
            context.replace(parent.getStart(), parent.getEnd(), code);
            break;
        case ts.SyntaxKind.CallExpression:
            break;
        case ts.SyntaxKind.PropertyAssignment:
            break;
        case ts.SyntaxKind.ReturnStatement:
            break;
    }
    return;
}
function genOffsetSetter(ref, value, property) {
    if (property.isPacked && property.size !== 32) {
        var mask = (((1 << (property.size)) - 1) << (property.offset)) >>> 0;
        return "((" + ref + " & " + mask + ") | (" + value + " << " + property.offset + ") >>> 0)";
    }
    return value;
}
function genOffsetGetter(ref, property) {
    if (property.isPacked && property.size !== 32) {
        var shift = " >>> " + property.offset;
        if (property.offset === 0) {
            shift = "";
        }
        var size = (1 << property.size) - 1;
        return "(((" + ref + shift + ") & " + size + ") >>> 0)";
    }
    return ref;
}
