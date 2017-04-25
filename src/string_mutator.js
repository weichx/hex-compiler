"use strict";
exports.__esModule = true;
var text_mutation_1 = require("./text_mutation");
var text_replace_1 = require("./text_replace");
var StringMutator = (function () {
    function StringMutator(text) {
        this.text = text;
        this.prependStrings = [];
        this.appendStrings = [];
        this.mutations = [];
    }
    StringMutator.prototype.insertLine = function (position, str) {
        this.insert(position, str + '\n');
    };
    StringMutator.prototype.insert = function (position, str) {
        this.addMutation(new text_mutation_1.TextMutation(position, position + str.length, str));
    };
    StringMutator.prototype.replace = function (start, end, str) {
        this.addMutation(new text_replace_1.TextReplace(start, end, str));
    };
    StringMutator.prototype.remove = function (start, end) {
        this.replace(start, end, "");
    };
    StringMutator.prototype.prepend = function (str) {
        this.prependStrings.push(str);
    };
    StringMutator.prototype.prependLine = function (str) {
        this.prependStrings.push(str + "\n");
    };
    StringMutator.prototype.append = function (str) {
        this.appendStrings.push(str);
    };
    StringMutator.prototype.appendLine = function (str) {
        this.appendStrings.push(str + "\n");
    };
    StringMutator.prototype.addMutation = function (mutation) {
        var invalid = (mutation.start < 0 ||
            mutation.start > this.text.length - 1 ||
            mutation.end < 0 ||
            mutation.end < mutation.start);
        if (invalid) {
            throw new Error("Mutation is invalid! " + JSON.stringify(mutation, null, 4));
        }
        for (var i = 0; i < this.mutations.length; i++) {
            if (this.mutations[i].overlaps(mutation)) {
                throw new Error("Mutations overlap! " +
                    JSON.stringify(this.mutations[i], null, 4) +
                    JSON.stringify(mutation, null, 4));
            }
        }
        this.mutations.push(mutation);
    };
    StringMutator.prototype.applyMutations = function () {
        this.applyBodyMutations();
        //if no actions overlap this is easy to solve, if they do then we need to re-parse after each action
        return this.prependStrings.join("") + this.text + this.appendStrings.join("");
    };
    StringMutator.prototype.applyBodyMutations = function () {
        this.mutations.sort(function (m0, m1) {
            if (m0.start > m1.start)
                return 1;
            if (m0.start === m1.start)
                return 0;
            return -1;
        });
        while (this.mutations.length) {
            var mutation = this.mutations.shift();
            this.text = mutation.apply(this.text); //
            this.offsetMutations(mutation.offset);
        }
    };
    StringMutator.prototype.offsetMutations = function (offset) {
        for (var i = 0; i < this.mutations.length; i++) {
            var mutation = this.mutations[i];
            mutation.start += offset;
            mutation.end += offset;
        }
    };
    return StringMutator;
}());
exports.StringMutator = StringMutator;
