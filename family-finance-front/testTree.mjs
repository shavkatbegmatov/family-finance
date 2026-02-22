import fs from 'fs';
import calcTree from 'relatives-tree';
import axios from 'axios';

async function test() {
    try {
        const res = await axios.get('http://localhost:8098/api/family-tree/18');
        const treeData = res.data.data;
        const validPersonIds = new Set(treeData.persons.map(p => p.id));
        const sortDir = 1;

        const rtNodes = treeData.persons.map((person) => {
            const id = String(person.id);
            const gender = person.gender === 'FEMALE' ? 'female' : 'male';
            const parents = [];
            const children = [];
            const siblings = [];
            const spouses = [];

            treeData.familyUnits.forEach((fu) => {
                const isPartner = fu.partners.some((p) => p.personId === person.id);
                const isChild = fu.children.some((c) => c.personId === person.id);

                if (isPartner) {
                    fu.partners.forEach((p) => {
                        if (p.personId !== person.id && validPersonIds.has(p.personId)) spouses.push({ id: String(p.personId), type: 'married' });
                    });
                    fu.children.forEach((c) => {
                        if (validPersonIds.has(c.personId)) children.push({ id: String(c.personId), type: c.lineageType === 'ADOPTED' ? 'adopted' : 'blood' });
                    });
                }
                if (isChild) {
                    fu.partners.forEach((p) => {
                        if (validPersonIds.has(p.personId)) parents.push({ id: String(p.personId), type: 'blood' });
                    });
                    fu.children.forEach((c) => {
                        if (c.personId !== person.id && validPersonIds.has(c.personId)) siblings.push({ id: String(c.personId), type: 'blood' });
                    });
                }
            });

            spouses.sort((a, b) => (Number(a.id) - Number(b.id)) * sortDir);
            children.sort((a, b) => (Number(a.id) - Number(b.id)) * sortDir);
            parents.sort((a, b) => (Number(a.id) - Number(b.id)) * sortDir);
            siblings.sort((a, b) => (Number(a.id) - Number(b.id)) * sortDir);

            return { id, gender, parents, children, siblings, spouses };
        });

        // Try both root genders just in case
        try {
            const l = calcTree(rtNodes, { rootId: '18' });
            console.log("SUCCESS for male!");
        } catch (e) {
            console.log("FAIL for male!", e.message, e.stack);
        }

        try {
            rtNodes.find(n => n.id === '18').gender = 'female';
            const l = calcTree([...rtNodes], { rootId: '18' });
            console.log("SUCCESS for female!");
        } catch (e) {
            console.log("FAIL for female!", e.message);
        }

    } catch (e) {
        console.log("API Error", e.message);
    }
}
test();
