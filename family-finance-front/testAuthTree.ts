import axios from 'axios';
import calcTree from 'relatives-tree';
import fs from 'fs';

async function run() {
    try {
        console.log("Logging in...");
        const loginRes = await axios.post('http://localhost:8098/api/v1/auth/login', {
            username: 'admin',
            password: 'admin123'
        });
        const data = loginRes.data;
        const token = data.data?.accessToken || data.data?.token || data.accessToken;
        console.log("Logged in, token received:", token ? "YES" : "NO");

        const api = axios.create({
            baseURL: 'http://localhost:8098/api',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // 1. Get current tree
        let currentTree;
        try {
            const res = await api.get('/v1/family-tree');
            currentTree = res.data.data;
        } catch (e) { console.error("Could not fetch auth tree", e); return; }

        // 2. Find Rohatoy
        const rohatoy = currentTree.persons.find((p: any) => p.fullName?.toLowerCase().includes('rohat'));

        if (!rohatoy) {
            console.log("Rohatoy not found even in current tree!");
            fs.writeFileSync("current_tree_dump.json", JSON.stringify(currentTree, null, 2));
            return;
        }

        console.log(`Found Rohatoy! ID: ${rohatoy.id}, Name: ${rohatoy.fullName}`);

        // 3. Fetch Rohatoy's tree (the one that crashes)
        const crashRes = await api.get(`/v1/family-tree?personId=${rohatoy.id}`);
        const crashTree = crashRes.data.data;

        fs.writeFileSync("rohatoy_tree_raw.json", JSON.stringify(crashTree, null, 2));

        testTree(crashTree);

    } catch (e: any) {
        console.error("FATAL ERROR", e.message, e.response?.data);
    }
}

function testTree(treeData: any) {
    const validPersonIds = new Set(treeData.persons.map((p: any) => p.id));
    const sortDir = 1; // Try reproducing with positive sortDir (male root) or negative (female root)
    const rootPersonId = treeData.rootPersonId;
    const rootPerson = treeData.persons.find((p: any) => p.id === rootPersonId);
    if (!rootPerson) return;
    const isRootFemale = rootPerson.gender === 'FEMALE';
    const activeSortDir = isRootFemale ? -1 : 1;

    const ancestors = new Set<number>();
    let currentLevel = [rootPersonId];
    while (currentLevel.length > 0) {
        const nextLevel: number[] = [];
        currentLevel.forEach(id => {
            if (id !== undefined && !ancestors.has(id)) {
                ancestors.add(id);
                treeData.familyUnits.forEach((fu: any) => {
                    if (fu.children.some((c: any) => c.personId === id)) {
                        fu.partners.forEach((p: any) => {
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

    const rtNodes = treeData.persons.map((person: any) => {
        const id = String(person.id);
        const gender = person.gender === 'FEMALE' ? 'female' : 'male';
        const parents: any[] = [];
        const children: any[] = [];
        const siblings: any[] = [];
        const spouses: any[] = [];

        treeData.familyUnits.forEach((fu: any) => {
            const isPartner = fu.partners.some((p: any) => p.personId === person.id);
            const isChild = fu.children.some((c: any) => c.personId === person.id);

            if (isPartner) {
                fu.partners.forEach((p: any) => {
                    if (p.personId !== person.id && validPersonIds.has(p.personId)) spouses.push({ id: String(p.personId), type: 'married' });
                });
                fu.children.forEach((c: any) => {
                    if (validPersonIds.has(c.personId)) children.push({ id: String(c.personId), type: c.lineageType === 'ADOPTED' ? 'adopted' : 'blood' });
                });
            }
            if (isChild) {
                fu.partners.forEach((p: any) => {
                    if (validPersonIds.has(p.personId)) parents.push({ id: String(p.personId), type: 'blood' });
                });
                fu.children.forEach((c: any) => {
                    if (c.personId !== person.id && validPersonIds.has(c.personId)) siblings.push({ id: String(c.personId), type: 'blood' });
                });
            }
        });

        // The current logic in codebase
        spouses.sort((a: any, b: any) => {
            const aIsAncestor = ancestors.has(Number(a.id));
            const bIsAncestor = ancestors.has(Number(b.id));
            if (aIsAncestor && !bIsAncestor) return -1;
            if (!aIsAncestor && bIsAncestor) return 1;
            return (Number(a.id) - Number(b.id)) * activeSortDir;
        });
        children.sort((a: any, b: any) => (Number(a.id) - Number(b.id)) * activeSortDir);
        parents.sort((a: any, b: any) => (Number(a.id) - Number(b.id)) * activeSortDir);
        siblings.sort((a: any, b: any) => (Number(a.id) - Number(b.id)) * activeSortDir);

        return { id, gender, parents, children, siblings, spouses };
    });

    try {
        const rootIndex = rtNodes.findIndex((n: any) => n.id === String(rootPersonId));
        if (rootIndex > -1) rtNodes[rootIndex].gender = 'male'; // Hack replicated
        const calcTreeFunc = (calcTree as any).default || calcTree;
        const l = calcTreeFunc(rtNodes, { rootId: String(rootPersonId) });
        console.log("calcTree SUCCESS!");
    } catch (e: any) {
        console.log("calcTree CRASH REPRODUCED!", e.message, e.stack);
        fs.writeFileSync('crash_nodes.json', JSON.stringify(rtNodes, null, 2));
    }
}

run();
