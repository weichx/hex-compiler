const path = require("path");
const Compiler = require('../src/compiler').CompilerHost;

describe("Compiler", function () {

    const tsconfig = path.resolve("./spec/test_project/tsconfig.json");
    const rootFiles = [
        path.resolve("./spec/test_project/file1.ts")
    ];

    it("should a compile file", function () {
        const compiler = new Compiler(rootFiles).initialize(tsconfig);
        const output = compiler.compile();
        expect(output.length).toBeGreaterThan(0);
        expect(output.indexOf("class File1Class")).not.toBe(-1);
    });

    it("should remove a decorator", function () {
        const compiler = new Compiler(rootFiles).initialize(tsconfig);
        const decoratorMutator = {
            test: function (classDeclaration, methodDeclaration, decorator) {
                return true;
            },
            mutate(context, classDeclaration, methodDeclaration, decorator) {
                context.remove(decorator.getStart(), decorator.getEnd());
                // const awake = context.findOrCreateMethod(classNode, "awake");
                // awake.addStatement();
            }
        };
        compiler.addDecoratorMutator(decoratorMutator);
        const output = compiler.compile();
        expect(output.indexOf(`__decorate([`)).toBe(-1);
    });

    it("should inject a method that doesn't exist", function () {
        const compiler = new Compiler(rootFiles).initialize(tsconfig);
        const decoratorMutator = {
            test: function (classDeclaration, methodDeclaration, decorator) {
                return true;
            },
            mutate(context, classDeclaration, methodDeclaration, decorator) {
                context.removeNode(decorator);
                context.getMethodEditor(classDeclaration.name.getText(), "injected");
            }
        };
        compiler.addDecoratorMutator(decoratorMutator);
        const output = compiler.compile();
        expect(output.indexOf(`injected() {`)).not.toBe(-1);
    });

    it("should add to the body of a method", function () {

        const compiler = new Compiler(rootFiles).initialize(tsconfig);
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
        const injectedIndex = output.indexOf('injected() {');
        const bodyIndex = output.indexOf("alert('working!')");
        expect(bodyIndex).toBeGreaterThan(injectedIndex);
        expect(bodyIndex).not.toBe(-1);
        expect(injectedIndex).not.toBe(-1);
    });

});