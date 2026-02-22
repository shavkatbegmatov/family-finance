import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import calcTreeModule from 'relatives-tree'; // Trigger import to ensure paths are correct

const require = createRequire(import.meta.url);
const relativesTreePath = path.dirname(require.resolve('relatives-tree'));
const childrenArrangeJsPath = path.join(relativesTreePath, 'children', 'arrange.js');
const parentsArrangeJsPath = path.join(relativesTreePath, 'parents', 'arrange.js');

function patchFile(filePath: string, isParents: boolean) {
    let arrangeCode = fs.readFileSync(filePath, 'utf8');

    if (!arrangeCode.includes('CRASH DATA CATCH')) {
        const propName = isParents ? 'parents' : 'children';
        const unitSource = isParents ? 'children' : 'parents';

        const originalFunc = `const arrangeNextFamily = (family, nextFamily` + (isParents ? `, right` : ``) + `) => {
    const unit = family.${unitSource}[0];
    const index = nextFamily.${propName}.findIndex(sameAs(unit));
    index === 0 && nextFamily.${propName}[index].pos === 0
        ? (nextFamily.X = getUnitX(family, unit)` + (isParents ? `` : ` - nextFamily.children[index].pos`) + `)
        : (nextFamily.${propName}[index].pos = getUnitX(family, unit) - nextFamily.X);`;

        const newFunc = `const arrangeNextFamily = (family, nextFamily` + (isParents ? `, right` : ``) + `) => {
    const unit = family.${unitSource}[0];
    const index = nextFamily.${propName}.findIndex(sameAs(unit));
    if (index === -1) {
        console.log("CRASH DATA CATCH from ${isParents ? 'parents' : 'children'}! unit:", JSON.stringify(unit));
        console.log("CRASH DATA CATCH from ${isParents ? 'parents' : 'children'}! target_family:", JSON.stringify(nextFamily.${propName}));
    }
    index === 0 && nextFamily.${propName}[index].pos === 0
        ? (nextFamily.X = getUnitX(family, unit)` + (isParents ? `` : ` - nextFamily.children[index].pos`) + `)
        : (nextFamily.${propName}[index].pos = getUnitX(family, unit) - nextFamily.X);`;

        if (arrangeCode.includes(originalFunc)) {
            fs.writeFileSync(filePath, arrangeCode.replace(originalFunc, newFunc));
            console.log(`Patched relatives-tree ${isParents ? 'parents' : 'children'} successfully.`);
        } else {
            console.log(`Could not find original function in ${isParents ? 'parents' : 'children'} to patch!`);
        }
    }
}

patchFile(parentsArrangeJsPath, true);
patchFile(childrenArrangeJsPath, false);

try {
    const rtNodes = JSON.parse(fs.readFileSync('crash_nodes.json', 'utf8'));
    const rootIndex = rtNodes.findIndex((n: any) => n.id === '30');
    if (rootIndex > -1) rtNodes[rootIndex].gender = 'male';

    const calcTree = (calcTreeModule as any).default || calcTreeModule;
    calcTree(rtNodes, { rootId: '30' });
    console.log("SUCCESS");
} catch (e: any) {
    console.log("CRASHED!");
}
