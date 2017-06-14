import * as ts from "typescript";
import {Visitor} from "./visitor";
import {VisitorContext} from "./visitor_context";
import {findAllDescendantsOfTypeWithName, getAssignedExpression, getContainingBlock, getParentNodeOfKind, getParentStatement, getSyntaxKind, getVariableIdentifier, isChildNode, isConst, makeVariableName} from "./util";
import {debug} from "util";

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

    getSize() : number {
        var length = this.properties.length;
        if (length !== 0) {
            return this.properties[length - 1].row;
        }
        return 0;
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
    if(!isCall) return false;
    const text = node.getText();
    if(text.indexOf("__inline_struct") !== -1) return true;
    if(text.indexOf("__struct") !== -1) return true;
    if(text.indexOf("__debugStruct<") !== -1) return true;
    return (text.indexOf("__structView") !== -1);
}

function makeDebugStruct(data : StructData) {
    var retn = "{\n";
    data.properties.forEach((p) => {
        if(p.name.indexOf("__struct_type_check__") !== -1) return;
        retn += `${p.name}: ${data.tableName}[(${data.offsetValue} * ${data.getSize()}) + ${p.row}],\n`;
    });
    retn += "}";
    return retn;
}

function processCallExpression(callNode : ts.CallExpression, context : VisitorContext) : boolean {
    if (!isStructConstructorFn(callNode)) {
        return false;
    }

    var parentStatement = getParentStatement(callNode) as ts.VariableStatement;

    if (parentStatement.kind !== ts.SyntaxKind.VariableStatement) {
        return false;
    }

    if (!isConst(parentStatement)) {
        return false;
    }
    if(callNode.getText().indexOf("__debugStruct") !== -1) {
        var callExpression = getAssignedExpression(parentStatement) as ts.CallExpression;
        var structData = extractStructConstructorData(null, callExpression, context.checker);
        context.replaceNode(callNode, makeDebugStruct(structData));
    }
    else {
        var identifier = getVariableIdentifier(parentStatement);
        var callExpression = getAssignedExpression(parentStatement) as ts.CallExpression;
        var structData = extractStructConstructorData(identifier, callExpression, context.checker);
        var block = getContainingBlock(callNode);

        var usages = getIdentifierUsageInBlock(block, identifier);
        //if a usage contains another usage, the outermost usage should handle all the transformations
        for (var i = 0; i < usages.length; i++) {
            generateCode(usages[i], structData, context);
        }
    }

    return true;
}

function isStruct(type : ts.Type) {
    var baseTypes = type.getBaseTypes();
    return baseTypes.length === 1;
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

    try {
        var tableName = callExpression.arguments[0].getText();
        var offsetValue = callExpression.arguments[1].getText();
        var type = checker.getTypeAtLocation(callExpression.typeArguments[0]);
        var data = new StructData(identifier, tableName, offsetValue);
        if (!isStruct(type)) {
            console.error(type.symbol.name, "is not a valid struct. Must extend Struct & only Struct");
        }
        data.properties = createProperties(type);
        data.typeName = type.symbol.name;
    } catch(e) {
        console.log(e.stack);
    }
    return data;
}

function createProperties(type : ts.Type) {
    var cached = structPropertyMap.get(type.symbol.name);
    if (cached) {
        return cached;
    }

    var typeProperties = type.getApparentProperties().filter((p) => {
        return p.getName() !== "__struct_type_check__";
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
//StructArray<Type>
//__StructArrayFloat_create<Type>(itemCount);
export class StructVisitor extends Visitor {

    private structCount = 0;

    public shouldVisitFile(ast : ts.SourceFile) : boolean {
        if (ast.isDeclarationFile) return false;
        var text = ast.text;
        return text.indexOf("__inline_struct<") !== -1 || text.indexOf("__debugStruct<") !== -1 || text.indexOf("__struct<") !== -1 || text.indexOf("__sizeof<") !== -1;
    }

    public filter(node : ts.Node) : boolean {
        return true;
    }

    public beforeVisit(ast : ts.SourceFile, context : VisitorContext) {
        this.structCount = (ast.text.match(/__inline_struct/g) || []).length;
        this.structCount += (ast.text.match(/__struct</g) || []).length;
        this.structCount += (ast.text.match(/__debugStruct</g) || []).length;
        var uses = findAllDescendantsOfTypeWithName(ast, ts.SyntaxKind.Identifier, "__sizeof");
        for (var i = 0; i < uses.length; i++) {
            var parent = uses[i].parent;
            if (parent.kind === ts.SyntaxKind.CallExpression) {
                var callNode = parent as ts.CallExpression;
                const type = context.checker.getTypeAtLocation(callNode.typeArguments[0]);
                //todo if no type argument presented, throw an error
                var properties = createProperties(type);
                var length = properties.length;
                if (length !== 0) {
                    length = properties[length - 1].row;
                }
                context.replaceNode(uses[i].parent, length.toString());
            }
        }
    }

    public afterVisit() {
        this.structCount = 0;
    }

    public visit(node : ts.Node, context : VisitorContext) {
        if (this.structCount === 0) {
            return;
        }
        if (node.kind === ts.SyntaxKind.CallExpression) {
            if (processCallExpression(node as ts.CallExpression, context)) {
                this.structCount--;
            }
        }
        //todo also handle pre and post fix unary expressions
       // else if(node.kind === ts.SyntaxKind.ExpressionStatement) {
            // if(node.getText().indexOf("__struct<") !== -1) {
            //     //todo bottom of chain here is a call expression, need to convert it to a usable form
            //     //ie tableName[(index * size) + propertyOffset]++;
            //     console.log("we dont't support expression statements yet:", node.getText());
            //     // ts.forEachChild(node, (e) => console.log(getSyntaxKind(e)));
            //     // ts.forEachChild(node.getChildAt(0), (e) => console.log(getSyntaxKind(e)));
            //     // ts.forEachChild(node.getChildAt(0).getChildAt(0), (e) => console.log(getSyntaxKind(e)))
            // }
        //}
        //else {
           // console.log(getSyntaxKind(node), node.getText());
        //}
        ts.forEachChild(node, (childNode : ts.Node) => {
            this.visit(childNode, context);
        });

    }

}

function generateCode(identifier : ts.Identifier, data : StructData, context : VisitorContext) {
    var parent = identifier.parent;

    try {
        switch (parent.kind) {
            case ts.SyntaxKind.VariableDeclaration:

                var removedNode = getParentNodeOfKind(parent, ts.SyntaxKind.VariableStatement);
                if (data.didDeclare) {
                    console.error("Looks like you are reclaring a variable with the same name as struct: " + data.identifier.getText() +
                        ", that isn't supported yet, make sure your variables are in different lexical scopes. " +
                        parent.getSourceFile().fileName + " (" + removedNode.getText() + ")");
                }
                else {
                    if(removedNode.getText().indexOf("__struct<") !== -1) {
                        context.insertOnNewLine(removedNode.getEnd(), `const ${data.offsetName} = (${data.offsetValue}) * ${data.getSize()}` +
                            " /* " + data.identifier.getText() + " | sizeof<" + data.typeName + "> */");
                    }
                    else {
                        context.insertOnNewLine(removedNode.getEnd(), `const ${data.offsetName} = ${data.offsetValue};` +
                        " /* " + data.identifier.getText() + " */");

                    }
                    context.removeNode(removedNode);
                    data.didDeclare = true;
                }
                break;
            // case ts.SyntaxKind.VariableStatement:
            //     break;
            case ts.SyntaxKind.PropertyAccessExpression:
                var accessExpression = (parent as ts.PropertyAccessExpression);
                var accessedProperty = accessExpression.name.getText();

                var property = data.getProperty(accessedProperty);
                var tableName = `${data.tableName}`;
                var ref = tableName + "[" + data.offsetName;
                ref += property.row === 0 ? "]" : " + " + property.row + "]";
                var code = genOffsetGetter(ref, data.identifier.getText(), property);

                var bin = getParentNodeOfKind(identifier, ts.SyntaxKind.BinaryExpression) as ts.BinaryExpression;
                if (bin) {

                    //todo currently borked when assigning things like:
                    //buffer[_$_9079]=((buffer[_$_9079] & 4294901760) | (transformData.childCount << 16) >>> 0)
                    //transformData.childCount is a struct but we process in a bad order.
                    //need to find these cases and treat them as a single op or we get bad replacements
                    //if usage.contains any other usage, make a temp string mutator with parent text
                    //we need to coalesce the text mutations
                    if (isChildNode(bin.left, identifier)) {
                        var right = bin.right.getText();
                        context.removeNode(bin.operatorToken);
                        context.removeNode(bin.right);
                        code = ref + bin.operatorToken.getText() + genOffsetSetter(ref, data.identifier.getText(), `${right}`, bin.operatorToken.getText(), property);
                    }
                    else if (isChildNode(bin.right, identifier)) {
                        var left = bin.left.getText();
                        context.removeNode(bin.operatorToken);
                        context.removeNode(bin.left);
                        code = left + bin.operatorToken.getText() + genOffsetGetter(`${ref}`, data.identifier.getText(), property);
                    }
                }

                context.replace(
                    parent.getStart(),
                    parent.getEnd(),
                    code);
                break;
            // case ts.SyntaxKind.CallExpression:
            //     break;
            // case ts.SyntaxKind.PropertyAssignment:
            //     break;
            // case ts.SyntaxKind.ReturnStatement:
            //     break;
            default:
                console.log("missed", getSyntaxKind(parent));
        }
    }
    catch (e) {
        console.log(e.stack);
    }
    return;
}

function genOffsetSetter(ref : string, fieldName : string, value : string, operator : string, property : StructProperty) {
    var debugInfo = "/*" + fieldName + "." + property.name + " " + operator + " " + value + " */ ";
    if (property.isPacked && property.size !== 32) {
        var mask = (~(((1 << (property.size)) - 1) << (property.offset))) >>> 0;
        var maskString = mask.toString();
        if (mask === 4294901760) {
            maskString = "0x0000ffff";
        }
        else if (mask === 0xffff) {
            maskString = "0xffff";
        }
        return `((${ref} & ${maskString}) | (${value} << ${property.offset}) >>> 0) ${debugInfo}`;
    }
    return value + debugInfo;
}

function genOffsetGetter(ref : string, fieldName : string, property : StructProperty) {
    var debugInfo = "/*" + fieldName + "." + property.name + "*/ ";
    if (property.isPacked && property.size !== 32) {
        var shift = ` >>> ${property.offset}`;
        if (property.offset === 0) {
            shift = "";
        }
        var size = (1 << property.size) - 1;
        return `${debugInfo}(((${ref}${shift}) & ${size}) >>> 0)`;
    }
    return ref + debugInfo;
}
