const fs = require('fs');
const calcTree = require('relatives-tree').default || require('relatives-tree');

const rtNodes = JSON.parse(fs.readFileSync('crash_nodes.json', 'utf8'));

// Patch relatives-tree to try and catch the fault
const path = require('path');
const relativesTreePath = path.dirname(require.resolve('relatives-tree'));
const arrangeJsPath = path.join(relativesTreePath, 'parents', 'arrange.js');

let arrangeCode = fs.readFileSync(arrangeJsPath, 'utf8');

if (!arrangeCode.includes('console.log("CRASH DATA"')) {
    const patchedCode = arrangeCode.replace(
        'const index = nextFamily.parents.findIndex(sameAs(unit));',
        `const index = nextFamily.parents.findIndex(sameAs(unit));
        if (index === -1) {
            console.log("CRASH DATA! UNIT:", JSON.stringify(unit), "NEXT_FAMILY.PARENTS:", JSON.stringify(nextFamily.parents));
        }`
    );
    fs.writeFileSync(arrangeJsPath, patchedCode);
}

try {
    calcTree(rtNodes, { rootId: '30' });
    console.log("SUCCESS");
} catch (e) {
    console.log("CRASHED!");
}

// Restore
if (!arrangeCode.includes('console.log("CRASH DATA"')) {
    fs.writeFileSync(arrangeJsPath, arrangeCode);
}
