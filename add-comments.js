import { Project, Node } from "ts-morph";
const project = new Project();
// Load all ts and tsx files in frontend and backend src folders
project.addSourceFilesAtPaths([
    "apps/frontend/src/**/*.{ts,tsx}",
    "apps/backend/src/**/*.{ts,tsx}"
]);
const sourceFiles = project.getSourceFiles();
console.log(`Loaded ${sourceFiles.length} source files.`);
let filesModified = 0;
for (const sourceFile of sourceFiles) {
    let modified = false;
    // 1. Add // === IMPORTS === if there are import declarations
    const imports = sourceFile.getImportDeclarations();
    if (imports.length > 0) {
        const firstImport = imports[0];
        // Only add if there's no comment right before it
        const leadingRanges = firstImport.getLeadingCommentRanges();
        const hasImportsComment = leadingRanges.some(r => r.getText().includes("=== IMPORTS ==="));
        if (!hasImportsComment) {
            sourceFile.insertText(firstImport.getStart(), "// === IMPORTS ===\n");
            modified = true;
        }
    }
    // Refresh nodes after potential AST mutation
    const allTypes = [...sourceFile.getInterfaces(), ...sourceFile.getTypeAliases()].sort((a, b) => a.getPos() - b.getPos());
    if (allTypes.length > 0) {
        const firstType = allTypes[0];
        const leadingRanges = firstType.getLeadingCommentRanges();
        const hasTypeComment = leadingRanges.some(r => r.getText().includes("=== INTERFACES & TYPES ==="));
        if (!hasTypeComment) {
            sourceFile.insertText(firstType.getStart(), "\n// === INTERFACES & TYPES ===\n");
            modified = true;
        }
    }
    // Refresh nodes again
    const statements = sourceFile.getStatements();
    const mainStatements = statements.filter(s => Node.isFunctionDeclaration(s) ||
        Node.isClassDeclaration(s) ||
        Node.isVariableStatement(s));
    const componentLike = mainStatements.filter(s => {
        if (Node.isFunctionDeclaration(s))
            return true;
        if (Node.isClassDeclaration(s))
            return true;
        if (Node.isVariableStatement(s)) {
            const decls = s.getDeclarations();
            return decls.some(d => d.getInitializer() && Node.isArrowFunction(d.getInitializer()));
        }
        return false;
    });
    if (componentLike.length > 0) {
        // Skip adding "MAIN COMPONENT" if the file is an index or something simple, but let's just add it to the first major block
        const firstComp = componentLike[0];
        const leadingRanges = firstComp.getLeadingCommentRanges();
        const hasCompComment = leadingRanges.some(r => r.getText().includes("=== MAIN COMPONENT ===") || r.getText().includes("=== MAIN FUNCTIONS ==="));
        if (!hasCompComment) {
            const isTsx = sourceFile.getExtension() === ".tsx";
            const commentStr = isTsx ? "// === MAIN COMPONENT ===" : "// === MAIN FUNCTIONS ===";
            sourceFile.insertText(firstComp.getStart(), `\n${commentStr}\n`);
            modified = true;
        }
    }
    if (modified) {
        filesModified++;
    }
}
console.log(`Saving modifications for ${filesModified} files...`);
project.saveSync();
console.log("Done.");
