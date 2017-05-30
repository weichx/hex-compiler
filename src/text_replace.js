"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
exports.__esModule = true;
var text_mutation_1 = require("./text_mutation");
var TextReplace = (function (_super) {
    __extends(TextReplace, _super);
    function TextReplace(start, end, content) {
        var _this = _super.call(this, start, end, content) || this;
        var replacedLength = end - start;
        _this.offset = content.length - replacedLength;
        return _this;
        //
        // if(replacedLength < content.length) {
        // }
        // else {
        //     this.offset = content.length - replacedLength;
        // }
    }
    TextReplace.prototype.apply = function (text) {
        var start = text.substring(0, this.start);
        var end = text.substring(this.end, text.length);
        return start + this.content + end;
    };
    return TextReplace;
}(text_mutation_1.TextMutation));
exports.TextReplace = TextReplace;
