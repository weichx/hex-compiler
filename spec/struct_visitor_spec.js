const path = require("path");
const Compiler = require('../src/compiler').Compiler;
const StructVisitor = require("../src/struct_visitor").StructVisitor;

describe("Struct Visitor", function() {

    const tsconfig = path.resolve("./spec/test_project/tsconfig.json");
    const rootFiles = [
        path.resolve("./spec/test_project/struct_file.ts")
    ];

    fit("should visit a struct", function() {
        const compiler = new Compiler(rootFiles, tsconfig);
        compiler.addVisitor(new StructVisitor());
        const output = compiler.compile();
        console.log(output);
        expect(output.indexOf("table[_$_")).not.toBe(-1);
    });

    // it("should figure out a struct size", function() {
    //     const compiler = new Compiler(rootFiles, tsconfig);
    //     compiler.addVisitor(new StructVisitor());
    //     const output = compiler.compile();
    //     var split = output.split("\n");
    //     var sizeLine = split.find((line) => {
    //         return line.indexOf("var ENTITY_STRUCT_SIZE =") !== -1;
    //     });
    //     expect(sizeLine).toBeDefined();
    //     var split2 = sizeLine.split("=");
    //     expect(split2[1].indexOf("2")).not.toBe(-1);
    //     sizeLine = split.find((line) => {
    //         return line.indexOf("var TEST_EMPTY_STRUCT_SIZE =") !== -1;
    //     });
    //     expect(sizeLine).toBeDefined();
    //     split2 = sizeLine.split("=");
    //     expect(split2[1].indexOf("0")).not.toBe(-1);
    // });

});