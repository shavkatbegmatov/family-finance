import fs from 'fs';

const nodes = JSON.parse(fs.readFileSync('crash_nodes.json', 'utf8'));

// relatives-tree creates parent units by: nodes.sort(byGender(root.gender))
// children units are created by: [child] or [child, spouse] etc. 

// The easiest way is to just find any arrays of IDs that are sorted differently
let found = false;

for (const n of nodes) {
    if (n.parents && n.parents.length > 1) {
        // Did our sorting preserve ID order?
        const isSortedById = n.parents[0].id <= n.parents[1].id;
        // console.log(`Node ${n.id} parents: ${n.parents[0].id}, ${n.parents[1].id} (SortedById: ${isSortedById})`);
    }
}

// Relatives-tree crashes when a family unit cannot be matched. 
// A family unit matches if the node IDs in the unit are exactly the same.
// In our hook, spouses are grouped: [target, spouse].sort(byGender('male'))
const byGender = (target: string) => (_: any, b: any) => (b.gender !== target ? -1 : 1);

nodes.forEach((n: any) => {
    if (n.spouses && n.spouses.length > 0) {
        for (const spouseRel of n.spouses) {
            const spouse = nodes.find((s: any) => s.id === spouseRel.id);
            if (spouse && spouse.gender === n.gender) {
                console.log(`SAME GENDER SPOUSES: Node ${n.id} (${n.gender}) + Spouse ${spouse.id} (${spouse.gender})`);
                found = true;
            }
        }
    }

    if (n.parents && n.parents.length > 1) {
        const p1 = nodes.find((s: any) => s.id === n.parents[0].id);
        const p2 = nodes.find((s: any) => s.id === n.parents[1].id);
        if (p1 && p2 && p1.gender === p2.gender) {
            console.log(`SAME GENDER PARENTS: Node ${n.id} -> Parent ${p1.id} (${p1.gender}) + Parent ${p2.id} (${p2.gender})`);
            found = true;
        }
    }
});

if (!found) {
    console.log("No same-gender couples found. The bug must be ancestor sorting!");
}
