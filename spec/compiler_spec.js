const path = require("path");
const Compiler = require('../src/compiler').Compiler;

describe("Compiler", function () {

    const tsconfig = path.resolve("./spec/test_project/tsconfig.json");
    const rootFiles = [
        path.resolve("./spec/test_project/file1.ts")
    ];

    it("should a compile file", function () {
        const compiler = new Compiler(rootFiles, tsconfig);
        const output = compiler.compile();
        expect(output.length).toBeGreaterThan(0);
        expect(output.indexOf("class File1Class")).not.toBe(-1);
    });

    it("should remove a decorator", function () {
        const compiler = new Compiler(rootFiles, tsconfig);
        const decoratorMutator = {
            test: function (classDeclaration, methodDeclaration, decorator) {
                return true;
            },
            mutate(context, classDeclaration, methodDeclaration, decorator) {
                context.removeNode(decorator);
            }
        };
        compiler.addDecoratorMutator(decoratorMutator);
        const output = compiler.compile();
        expect(output.indexOf(`__decorate([`)).toBe(-1);
    });

    it("should inject a method that doesn't exist", function () {
        const compiler = new Compiler(rootFiles, tsconfig);
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
        const injectedIndex = output.indexOf('injected() {');
        const bodyIndex = output.indexOf("alert('working!')");
        expect(bodyIndex).toBeGreaterThan(injectedIndex);
        expect(bodyIndex).not.toBe(-1);
        expect(injectedIndex).not.toBe(-1);
    });

    it("should mutate class decorators", function() {
        const compiler = new Compiler(rootFiles, tsconfig);
        const decoratorMutator = {
            test: function (classDeclaration, methodDeclaration, decorator) {
                return !!methodDeclaration;
            },
            mutate(context, classDeclaration, methodDeclaration, decorator) {
                context.removeNode(decorator);
                const injectedMethod = context.getMethodEditor(classDeclaration, "injected");
                injectedMethod.addStatement("alert('class decorator!')");
            }
        };
        compiler.addDecoratorMutator(decoratorMutator);
        const output = compiler.compile();
        const injectedIndex = output.indexOf('injected() {');
        const bodyIndex = output.indexOf("alert('class decorator!')");
        expect(bodyIndex).toBeGreaterThan(injectedIndex);
        expect(bodyIndex).not.toBe(-1);
        expect(injectedIndex).not.toBe(-1);
    });

    it("should inject code into a class", function() {
        const compiler = new Compiler(rootFiles, tsconfig);
        const decoratorMutator = {
            test: function (classDeclaration, methodDeclaration, decorator) {
                return !!methodDeclaration;
            },
            mutate(context, classDeclaration, methodDeclaration, decorator) {
                context.removeNode(decorator);
                context.inject(classDeclaration, "public static injectedPropertyStatic : string = 'yes'");
                context.inject(classDeclaration, "public injectedPropertyNonStatic : string = 'yes'");
            }
        };
        compiler.addDecoratorMutator(decoratorMutator);
        const output = compiler.compile();
        const injectedIndexStatic = output.indexOf(`File1Class.injectedPropertyStatic = 'yes'`);
        const injectedIndex = output.indexOf(`this.injectedPropertyNonStatic = 'yes'`);
        expect(injectedIndexStatic).not.toBe(-1);
        expect(injectedIndex).not.toBe(-1);
    });

});