import * as ts from "typescript";

export function getMethodMembers(node : ts.ClassDeclaration) {
    const retn = new Array<ts.MethodDeclaration>();
    const members = node.members;
    for (let i = 0; i < members.length; i++) {
        if (members[i].kind === ts.SyntaxKind.MethodDeclaration) {
            retn.push(members[i] as ts.MethodDeclaration);
        }
    }
    return retn;
}

export function findClassInFile(ast : ts.Node, className : string) : ts.ClassDeclaration {
    let node : ts.ClassDeclaration = null;
    if (ast.kind === ts.SyntaxKind.ClassDeclaration) {
        if ((ast as ts.ClassDeclaration).name.getText() === className) {
            return ast as ts.ClassDeclaration;
        }
    }
    ts.forEachChild(ast, function (child : ts.Node) {
        if (!node) {
            node = findClassInFile(child, className);
        }
    });
    return node;
}

export function findMethodOnClass(startNode : ts.ClassDeclaration, methodName : string) : ts.ClassElement {
    const members = startNode.members;
    for (let i = 0; i < members.length; i++) {
        if (members[i].kind === ts.SyntaxKind.MethodDeclaration) {
            if (members[i].name.getText() === methodName) {
                return members[i];
            }
        }
    }
    return null;
}

export function getDeclarationFlags(classElement : ts.ClassElement) {
    const modifierFlags = ts.getCombinedModifierFlags(classElement);
    const isStatic = (modifierFlags & ts.ModifierFlags.Static) !== 0;
    const isPublic = (modifierFlags & ts.ModifierFlags.Public) !== 0;
    const isProtected = (modifierFlags & ts.ModifierFlags.Protected) !== 0;
    const isPrivate = (modifierFlags & ts.ModifierFlags.Private) !== 0;
    const isReadonly = (modifierFlags & ts.ModifierFlags.Readonly) !== 0;
    const isAsync = (modifierFlags & ts.ModifierFlags.Async) !== 0;
    const isAbstract = (modifierFlags & ts.ModifierFlags.Abstract) !== 0;
    return {
        isStatic,
        isPublic,
        isPrivate,
        isProtected,
        isReadonly,
        isAsync,
        isAbstract
    };
}

export function getFullTypeName(type : ts.Type) {
    let node = type.symbol.valueDeclaration;
    if (!node) return null;
    let name : string[] = [];
    while (node) {
        if (node.name) name.push(node.name.getText());
        node = node.parent as any;
    }
    return name.reverse().join(".");
}

export function getTypeLocation(type : ts.Type) {
    const file = getDeclaredFile(type);
    const name = getFullTypeName(type);
    return file + ":" + name;
}

export function getTypeId(type : ts.Type) {
    const typeName = getFullTypeName(type);
    if (!typeName) return -1;
    return getHashCode(typeName);
}

export function getBaseClass(type : ts.Type) : ts.Type {
    const baseTypes = type.getBaseTypes();
    if (baseTypes.length === 0) {
        return null;
    }
    return baseTypes[0];
}

//todo not working
export function getFullTypeHierarchy(type : ts.Type) : any {
    const baseTypes = type.getBaseTypes();
    if (baseTypes.length === 0) {
        return null;
    }
    //const baseHierarchy = getFullTypeHierarchy(baseTypes[0]);
    const baseProps = baseTypes[0].getProperties();
    const props = type.getProperties();
    const outProps : Array<any> = [];

    for(let i = 0; i < props.length; i++) {
        const prop = props[i];
        const name = prop.getName();
        var found = false;
        for(let j = 0; j < baseProps.length; j++) {
            const baseProp = baseProps[j];
            if(baseProp.getName() === name) {
                found = true;
                break;
            }
        }
        if(!found) {
            outProps.push(prop);
        }
        found = false;
    }
    return outProps;//null;
}

export function getOwnProperties(type : ts.Type) : Array<ts.Symbol> {
    const baseTypes = type.getBaseTypes();
    if (baseTypes.length === 0) {
        return type.getProperties();
    }

    const baseProps = baseTypes[0].getProperties();

    const props = type.getProperties();
    const outProps : Array<ts.Symbol> = [];

    for(let i = 0; i < props.length; i++) {
        const prop = props[i];
        const name = prop.getName();
        var found = false;
        for(let j = 0; j < baseProps.length; j++) {
            const baseProp = baseProps[j];
            if(baseProp.getName() === name) {
                found = true;
                break;
            }
        }
        if(!found) {
            outProps.push(prop);
        }
        found = false;
    }
    return outProps;
}

export function getOwnFields(type : ts.Type) {
    return getOwnProperties(type).filter(p => (p.flags & ts.SymbolFlags.Property) !== 0);
}

export function getOwnMethods(type : ts.Type) {
    return getOwnProperties(type).filter(p => (p.flags & ts.SymbolFlags.Method) !== 0);
}

//todo make relative to project root
export function getDeclaredFile(type : ts.Type) {
    try {
        return type.symbol.valueDeclaration.getSourceFile().fileName;
    }
    catch (e) {
        return null;
    }
}

export function isInterface(type : ts.Type) {
    return (type.symbol.flags & ts.SymbolFlags.Interface) !== 0;
}

export function isClass(type : ts.Type) {
    return (type.symbol.flags & ts.SymbolFlags.Class) !== 0;
}

export function isPropertyInherited(type : ts.Type, propertyName : string, propertyTypeId : number) {
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

function getHashCode(input : string) : number {
    let hash = 0;
    if (input.length === 0) return hash;
    for (let i = 0; i < input.length; i++) {
        const chr = input.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    return hash;
}

export function isStatement(node : ts.Node) {
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

export function getParentStatement(node : ts.Node) {
    var ptr = node.parent;
    while (ptr && !isStatement(ptr)) {
        ptr = ptr.parent;
    }
    return ptr as ts.Statement;
}


export function getSyntaxKind(node : ts.Node) {
    return ts.SyntaxKind[node.kind];
}

export function isBlockLike(node : ts.Node) {
        return node.kind === ts.SyntaxKind.SourceFile ||
         node.kind === ts.SyntaxKind.Block ||
         node.kind === ts.SyntaxKind.ModuleBlock ||
         node.kind === ts.SyntaxKind.CaseBlock ||
         node.kind === ts.SyntaxKind.DefaultClause;

}

export function getContainingBlock(node : ts.Node) : ts.BlockLike {
    var ptr = node.parent;
    while (ptr && !isBlockLike(ptr)) {
        ptr = ptr.parent;
    }
    return ptr as ts.BlockLike;
}

export function getParentNodeOfKind(node : ts.Node, kind : ts.SyntaxKind) {
    var p = node.parent;
    while(p && p.kind !== kind) {
        p = p.parent;
    }
    return p;
}

export function getChildNodeOfKind(node : ts.Node, kind : ts.SyntaxKind) {
    var children = node.getChildren();
    for(var i = 0; i < children.length; i++) {
        if(children[i].kind === kind) {
            return children[i];
        }
    }
    return null;
}

export function isChildNode(node : ts.Node, childTest : ts.Node) {
    var children = node.getChildren();
    for(var i = 0; i < children.length; i++) {
        if(children[i] === childTest) {
            return true;
        }
    }
    return false;
}

export function isConst(variableStatement : ts.VariableStatement) {
    var constKeywordKind = variableStatement.declarationList.getChildAt(0).kind;
    return (constKeywordKind === ts.SyntaxKind.ConstKeyword);
}

export function getGenericFunctionArguments(callExpression : ts.CallExpression) {
    return callExpression.typeArguments;
}

export function getVariableIdentifier(variableStatement : ts.VariableStatement) {
    var child2 = variableStatement.declarationList.getChildAt(1);
    var syntaxList = child2.getChildAt(0) as ts.SyntaxList;
    return syntaxList.getChildAt(0) as ts.Identifier;
}

export function getAssignedExpression(variableStatement : ts.VariableStatement) : ts.Expression {
    var child2 = variableStatement.declarationList.getChildAt(1);
    var syntaxList = child2.getChildAt(0) as ts.SyntaxList;
    return syntaxList.getChildAt(2) as ts.Expression;
}

export function makeVariableName(prefix = "") : string {
    return "_$_" + prefix + (Math.random() * 999 | 0).toString();
}