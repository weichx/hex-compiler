const StringMutator = require("../src/string_mutator").StringMutator;

describe("StringMutator", function() {

    it("should insert text", function () {
        const ctx = new StringMutator("hello");
        ctx.insert(2, "WORLD");
        expect(ctx.applyMutations()).toBe("heWORLDllo");
    });

    it("should insert text with newline", function () {
        const ctx = new StringMutator("hello");
        ctx.insertLine(2, "WORLD");
        expect(ctx.applyMutations()).toBe("heWORLD\nllo");
    });

    it("should replace text", function () {
        const ctx = new StringMutator("hello");
        ctx.replace(2, 4, "_REPLACED_");
        expect(ctx.applyMutations()).toBe("he_REPLACED_o");
    });

    it('should replace twice', function() {
        const ctx = new StringMutator("hello");
        ctx.replace(0, 2, "more");
        ctx.replace(2, 4, "_REPLACED_");
        expect(ctx.applyMutations()).toBe("more_REPLACED_o");
    });

    it("should append text to end of input", function () {
        const ctx = new StringMutator("hello");
        ctx.append("WORLD");
        expect(ctx.applyMutations()).toBe("helloWORLD");
    });

    it("should append text and newline to end of input", function () {
        const ctx = new StringMutator("hello");
        ctx.appendLine("WORLD");
        expect(ctx.applyMutations()).toBe("helloWORLD\n");
    });

    it("should prepend text to start of input", function () {
        const ctx = new StringMutator("hello");
        ctx.prepend("WORLD");
        expect(ctx.applyMutations()).toBe("WORLDhello");
    });

    it("should prepend text and newline to start of input", function () {
        const ctx = new StringMutator("hello");
        ctx.prependLine("WORLD");
        expect(ctx.applyMutations()).toBe("WORLD\nhello");
    });

    it("should remove text from input", function () {
        const ctx = new StringMutator("hello");
        ctx.remove(2, 4);
        expect(ctx.applyMutations()).toBe("heo");
    });

    // it("should not allow overlapping mutations", function () {
    //     const ctx = new StringMutator(("hello"), null);
    //     expect(function() {
    //         ctx.insert(2, "BAD");
    //         ctx.remove(1, 4);
    //         ctx.applyMutations()
    //     }).toThrow();
    // });

    fit("should do the right thing", function () {
        var str = "struct2.uiElementId = transformData.childCount;"
        const ctx = new StringMutator(str);
        var index = str.indexOf("transformData.childCount");
        var length = "transformData.childCount".length;
        ctx.replace(index, index + length, "Replaced1");
        ctx.replace(0, "struct2.uiElementId".length, "Replaced0");
        expect(ctx.applyMutations()).toBe("Replaced0 = Replaced1;")
    });

    it("should apply multiple mutations", function () {
        const ctx = new StringMutator("hello_world");
        ctx.remove(2, 4);
        ctx.insert(6, "INSERTED");
        ctx.replace(6, 12, "_NEW_STUFF");
        expect(ctx.applyMutations()).toBe("heo_INSERTED_NEW_STUFF");
    });

    it("should insert multiple strings in the same location", function() {
        const ctx = new StringMutator("helloworld");
        ctx.insert(5, "_INSERTED1_");
        ctx.insert(5, "INSERTED2_");
        expect(ctx.applyMutations()).toBe("hello_INSERTED1_INSERTED2_world");
    });

});