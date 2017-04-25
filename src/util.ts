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

export function findMethodOnClass(startNode : ts.ClassDeclaration, methodName : string) : ts.Node {
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
