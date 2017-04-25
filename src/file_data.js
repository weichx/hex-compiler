"use strict";
exports.__esModule = true;
var dtsRegex = /\.d\.ts$/i;
var FileData = (function () {
    function FileData(filePath) {
        this.filePath = filePath;
        this.version = 0;
        this.text = "";
        this.isScriptFile = true;
        this.forwardDependencies = [];
        this.reverseDependencies = {};
        this.snapshot = null;
        this.isTextDirty = true;
        this.isDefinition = dtsRegex.test(filePath);
    }
    FileData.prototype.getVersion = function () {
        return this.version.toString();
    };
    return FileData;
}());
exports.FileData = FileData;
