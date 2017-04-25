#!/usr/bin/env node
const fs = require("fs");
const CompilerHost = require("../src/compiler").CompilerHost;
const ts = require("typescript");
const path = require("path");
const chokidar = require("chokidar");

const command = process.argv[2].toLowerCase();


function getAllFileNames(start, output = []) {
    const rootPath = path.resolve(start);
    const files = fs.readdirSync(rootPath);
    files.forEach(function (file) {
        const fullFilePath = path.join(rootPath, file);
        if (fs.lstatSync(fullFilePath).isDirectory()) {
            getAllFileNames(fullFilePath, output);
        }
        else {
            output.push(fullFilePath);
        }
    });
    return output;
}

switch (command) {
    case "build-editor":
        buildEditor();
        break;
    case "build-spec":
        buildSpecs();
        break;
    case "watch-editor":
        watchEditor();
        break;
}

function buildEditor() {
    const files = [
        path.resolve("./src/editor/main.ts"),
    ].concat(typeDefFiles);

    const compileResult = new CompilerHost(files).initialize().compile();
    if (compileResult) {
        fs.writeFileSync(path.resolve("./build/editor.js"), compileResult);
    }
}

function buildSpecs() {
    const specRegex = /_spec.ts$/;

    const files = getAllFileNames("./spec").filter(function (file) {
        return specRegex.test(file);
    }).concat(typeDefFiles).concat([
        path.resolve("./node_modules/@types/jasmine/index.d.ts")
    ]);

    const compileResult = new CompilerHost(files).initialize().compile();
    fs.writeFileSync(path.resolve("./spec/spec_bundle.js"), compileResult);
}