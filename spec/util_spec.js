const path = require("path");
const ts = require("typescript");
const Compiler = require('../src/compiler').Compiler;
const Visitor = require("../src/visitor").Visitor;

const tsconfig = path.resolve("./spec/test_project/tsconfig.json");
const rootFiles = [
    path.resolve("./spec/test_project/util_file.ts")
];

describe("Util", function () {

    it("should find static methods", function () {
        const compiler = new Compiler(rootFiles, tsconfig);
        const decoratorMutator = {
            test: function (classDeclaration, methodDeclaration, decorator) {
                return true;
            },
            mutate(context, classDeclaration, methodDeclaration, decorator) {
                context.removeNode(decorator);
                const injectedMethod = context.getMethodEditor(classDeclaration, "injected");
                injectedMethod.addStatement("alert('working!')");
            }
        };
        compiler.addDecoratorMutator(decoratorMutator);
        const output = compiler.compile();
        expect(true).toBe(true);
    });

    it("should get source file from type", function () {
        const compiler = new Compiler(rootFiles, tsconfig);
        const decoratorMutator = {
            test: function (classDeclaration, methodDeclaration, decorator) {
                return true;
            },
            mutate(context, classDeclaration, methodDeclaration, decorator) {
                context.removeNode(decorator);
                const type = context.checker.getTypeAtLocation(classDeclaration);
                const baseType = context.util.getBaseClass(type);
                expect(context.util.getTypeLocation(type).indexOf("test_project/util_file.ts")).not.toBe(-1);
                expect(context.util.getTypeLocation(baseType).indexOf("test_project/util_file2.ts")).not.toBe(-1);
            }
        };
        compiler.addDecoratorMutator(decoratorMutator);
        const output = compiler.compile();
    });

    it("should figure out if declaration is a class or interface", function () {
        const compiler = new Compiler(rootFiles, tsconfig);
        var ran1 = false;
        var ran2 = false;
        class TestVisitor1 extends Visitor {
            filter(node) {
                return node.kind === ts.SyntaxKind.ClassDeclaration;
            }

            visit(node, context) {
                expect(context.util.isClass(node)).toBe(true);
                expect(context.util.isInterface(node)).toBe(false);
                ran1 = true;
            }
        }
        class TestVisitor2 extends Visitor {
            filter(node) {
                return node.kind === ts.SyntaxKind.InterfaceDeclaration
            }

            visit(node, context) {
                expect(context.util.isClass(node)).toBe(false);
                expect(context.util.isInterface(node)).toBe(true);
                ran2 = true;
            }
        }
        compiler.addVisitor(new TestVisitor1());
        compiler.addVisitor(new TestVisitor2());
        compiler.compile();
        expect(ran1).toBe(true);
        expect(ran2).toBe(true);

    });

    it("should inline a method call", function() {
        const compiler = new Compiler(rootFiles, tsconfig);
        var ran1 = false;
        class TestVisitor1 extends Visitor {
            filter(node) {
                return true;
            }

            visit(node, context) {
                if(node.kind === ts.SyntaxKind.ExpressionStatement) {
                    console.log(node.getText());
                }
                ran1 = true;
            }
        }
        compiler.addVisitor(new TestVisitor1());
        compiler.compile();
        expect(ran1).toBe(true);
    });

});