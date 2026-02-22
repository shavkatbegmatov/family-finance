const fs = require('fs');
const calcTree = require('relatives-tree').default || require('relatives-tree');

const treeData = JSON.parse(fs.readFileSync('rohatoy_tree_raw.json', 'utf8'));

const validPersonIds = new Set(treeData.persons.map(p => p.id));
const sortDir = 1;
const rootPersonId = treeData.rootPersonId;
const rootPerson = treeData.persons.find(p => p.id === rootPersonId);
const isRootFemale = rootPerson.gender === 'FEMALE';
const activeSortDir = isRootFemale ? -1 : 1;

const ancestors = new Set();
let currentLevel = [rootPersonId];
while (currentLevel.length > 0) {
    const nextLevel = [];
    currentLevel.forEach(id => {
        if (id !== undefined && !ancestors.has(id)) {
            ancestors.add(id);
            treeData.familyUnits.forEach(fu => {
                if (fu.children.some(c => c.personId === id)) {
                    fu.partners.forEach(p => {
                        if (validPersonIds.has(p.personId)) {
                            nextLevel.push(p.personId);
                        }
                    });
                }
            });
        }
    });
    currentLevel = nextLevel;
}

const rtNodes = treeData.persons.map(person => {
    const id = String(person.id);
    const gender = person.gender === 'FEMALE' ? 'female' : 'male';
    const parents = [];
    const children = [];
    const siblings = [];
    const spouses = [];

    treeData.familyUnits.forEach(fu => {
        const isPartner = fu.partners.some(p => p.personId === person.id);
        const isChild = fu.children.some(c => c.personId === person.id);

        if (isPartner) {
            fu.partners.forEach(p => {
                if (p.personId !== person.id && validPersonIds.has(p.personId)) spouses.push({ id: String(p.personId), type: 'married' });
            });
            fu.children.forEach(c => {
                if (validPersonIds.has(c.personId)) children.push({ id: String(c.personId), type: c.lineageType === 'ADOPTED' ? 'adopted' : 'blood' });
            });
        }
        if (isChild) {
            fu.partners.forEach(p => {
                if (validPersonIds.has(p.personId)) parents.push({ id: String(p.personId), type: 'blood' });
            });
            fu.children.forEach(c => {
                if (c.personId !== person.id && validPersonIds.has(c.personId)) siblings.push({ id: String(c.personId), type: 'blood' });
            });
        }
    });

    spouses.sort((a, b) => {
        const aIsAncestor = ancestors.has(Number(a.id));
        const bIsAncestor = ancestors.has(Number(b.id));
        if (aIsAncestor && !bIsAncestor) return -1;
        if (!aIsAncestor && bIsAncestor) return 1;
        return (Number(a.id) - Number(b.id)) * activeSortDir;
    });
    children.sort((a, b) => (Number(a.id) - Number(b.id)) * activeSortDir);
    parents.sort((a, b) => (Number(a.id) - Number(b.id)) * activeSortDir);
    siblings.sort((a, b) => (Number(a.id) - Number(b.id)) * activeSortDir);

    return { id, gender, parents, children, siblings, spouses };
});

const rootIndex = rtNodes.findIndex(n => n.id === String(rootPersonId));
rtNodes[rootIndex].gender = 'male';

try {
    const layout = calcTree(rtNodes, { rootId: String(rootPersonId) });
    console.log("SUCCESS!");
} catch (e) {
    console.log("CRASH:", e.stack);
}
