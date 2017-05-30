import * as ts from "typescript";
import {Visitor} from "./visitor";
import {IDecoratorMutator} from "./compiler";
import {VisitorContext} from "./visitor_context";
import {getAssignedExpression, getContainingBlock, getGenericFunctionArguments, getParentNodeOfKind, getParentStatement, getSyntaxKind, getVariableIdentifier, isConst, makeVariableName, getChildNodeOfKind, isChildNode} from "./util";

const structPropertyMap = new Map<string, StructProperty[]>();

class StructData {

    didDeclare : boolean;
    tableName : string;
    offsetName : string;
    offsetValue : string;
    typeName : string;
    properties : StructProperty[];
    identifier : ts.Identifier;

    constructor(identifier : ts.Identifier, tableName : string, offsetValue : string) {
        this.didDeclare = false;
        this.identifier = identifier;
        this.tableName = tableName;
        this.offsetName = makeVariableName();
        this.offsetValue = offsetValue;
        this.typeName = "";
        this.properties = [];
    }

    getProperty(name : string) {
        for (var i = 0; i < this.properties.length; i++) {
            if (this.properties[i].name === name) {
                return this.properties[i];
            }
        }
        return null;
    }

    getPropertyIndex(name : string) : number {
        for (var i = 0; i < this.properties.length; i++) {
            if (this.properties[i].name === name) {
                return this.properties[i].row;
            }
        }
        return -1;
    }

    getPropertyOffset(name : string) : number {
        for (var i = 0; i < this.properties.length; i++) {
            if (this.properties[i].name === name) {
                return this.properties[i].offset;
            }
        }
        return 0;
    }
}

class StructProperty {
    name : string;
    size : number;
    offset : number;
    row : number;
    isPacked : boolean;

    constructor() {
        this.name = null;
        this.offset = 0;
        this.row = 0;
        this.size = 0;
        this.isPacked = false;
    }
}

function isStructConstructorFn(node : ts.Node) {
    var isCall = node.kind === ts.SyntaxKind.CallExpression;
    return (isCall && node.getText().indexOf("__inline_struct") !== -1);
}

function processCallExpression(callNode : ts.CallExpression, context : VisitorContext) {
    if (!isStructConstructorFn(callNode)) {
        return;
    }
    var parentStatement = getParentStatement(callNode) as ts.VariableStatement;

    if (parentStatement.kind !== ts.SyntaxKind.VariableStatement) {
        return;
    }

    if (!isConst(parentStatement)) {
        return;
    }

    var identifier = getVariableIdentifier(parentStatement);
    var callExpression = getAssignedExpression(parentStatement) as ts.CallExpression;
    var structData = extractStructConstructorData(identifier, callExpression, context.checker);
    var block = getContainingBlock(callNode);

    var usages = getIdentifierUsageInBlock(block, identifier);

    for (var i = 0; i < usages.length; i++) {
        generateCode(usages[i], structData, context);
    }

}

function isStruct(type : ts.Type) {
    var baseTypes = type.getBaseTypes();
    return baseTypes.length === 1;
}

function assignRowsAndOffsets(properties : StructProperty[]) {
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

function getPackSize(str : string) {
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

function extractStructConstructorData(identifier : ts.Identifier, callExpression : ts.CallExpression, checker : ts.TypeChecker) : StructData {

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

function createProperties(type : ts.Type) {

    var cached = structPropertyMap.get(type.symbol.name);
    if (cached) {
        return cached;
    }

    var typeProperties = type.getApparentProperties().filter((p) => {
        return p.getName() !== "__struct_type_check__" && p.getName() !== "size";
    });

    const properties = new Array<StructProperty>();
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

function getIdentifiers(n : ts.Node, idName : string, output : ts.Node[]) : number {
    var count = 0;
    n.getChildren().forEach(function (c : ts.Node) {
        if (c.kind === ts.SyntaxKind.Identifier) {
            if ((c as ts.Identifier).text === idName) {
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

function getIdentifierUsageInBlock(block : ts.BlockLike, id : ts.Identifier) : Array<ts.Identifier> {
    var locations = new Array<ts.Identifier>();

    block.statements.forEach(function (statement : ts.Statement) {
        getIdentifiers(statement, id.text, locations);
    });

    return locations;
}

export class StructVisitor extends Visitor {

    public shouldVisitFile(ast : ts.SourceFile) : boolean {
        return !ast.isDeclarationFile;
    }

    public filter(node : ts.Node) : boolean {
        return true;
    }

    public visit(node : ts.Node, context : VisitorContext) {
        if (node.kind === ts.SyntaxKind.CallExpression) {
            processCallExpression(node as ts.CallExpression, context);

        }
        ts.forEachChild(node, (childNode : ts.Node) => {
            this.visit(childNode, context);
        });

    }

}

function generateCode(identifier : ts.Identifier, data : StructData, context : VisitorContext) {
    var parent = identifier.parent;

    switch (parent.kind) {
        case ts.SyntaxKind.VariableDeclaration:
            var removedNode = getParentNodeOfKind(parent, ts.SyntaxKind.VariableStatement);
            if (data.didDeclare) {
                console.error("Looks like you are reclaring a variable with the same name as struct: " + data.identifier.getText() +
                    ", that isn't supported yet, make sure your variables are in different lexical scopes. " +
                    parent.getSourceFile().fileName + " (" + removedNode.getText() + ")");
            }
            else {
                context.removeNode(removedNode);
                context.insertOnNewLine(removedNode.getEnd(), `const ${data.offsetName} = ${data.offsetValue};`);
                data.didDeclare = true;
            }
            break;
        case ts.SyntaxKind.VariableStatement:
            break;
        case ts.SyntaxKind.PropertyAccessExpression:
            var accessExpression = (parent as ts.PropertyAccessExpression);
            var accessedProperty = accessExpression.name.getText();

            if (accessedProperty === "size") {
                context.replace(
                    parent.getStart(),
                    parent.getEnd(),
                    (data.properties.length - 1).toString()
                );
                return
            }

            var property = data.getProperty(accessedProperty);
            var tableName = `${data.tableName}`;
            var ref = tableName + "[" + data.offsetName;
            ref += property.row === 0 ? "]" : " + " + property.row + "]";

            var variableStatement = getParentNodeOfKind(accessExpression, ts.SyntaxKind.VariableStatement) as ts.VariableStatement;

            var code = ref;

            if (variableStatement && property.isPacked) {
                code = genOffsetGetter(`${ref}`, property);
            }
            else {

                var bin = getParentNodeOfKind(identifier, ts.SyntaxKind.BinaryExpression) as ts.BinaryExpression;
                if (bin) {
                    if (isChildNode(bin.left, identifier)) {
                        var right = bin.right.getText();
                        context.removeNode(bin.operatorToken);
                        context.removeNode(bin.right);
                        code = ref + " = " + genOffsetSetter(ref, `(${right} | 0)`, property);
                    }
                    else if (isChildNode(bin.right, identifier)) {
                        var left = bin.left.getText();
                        context.removeNode(bin.operatorToken);
                        context.removeNode(bin.left);
                        code = left + " = " + genOffsetGetter(`${ref}`, property);
                    }
                }
            }

            context.replace(
                parent.getStart(),
                parent.getEnd(),
                code);
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
function genOffsetSetter(ref : string, value : string, property : StructProperty) {
    if (property.isPacked && property.size !== 32) {
        var mask = (((1 << (property.size)) - 1) << (property.offset)) >>> 0;
        return `((${ref} & ${mask}) | (${value} << ${property.offset}) >>> 0)`;
    }
    return value;
}

function genOffsetGetter(ref : string, property : StructProperty) {
    if (property.isPacked && property.size !== 32) {
        var shift = ` >>> ${property.offset}`;
        if (property.offset === 0) {
            shift = "";
        }
        var size = (1 << property.size) - 1;
        return `(((${ref}${shift}) & ${size}) >>> 0)`;
    }
    return ref;
}
