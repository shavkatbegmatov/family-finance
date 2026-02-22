import axios from 'axios';

async function run() {
    console.log("Starting search for Rohatoy...");
    let found = false;
    for (let i = 1; i <= 100; i++) {
        try {
            const res = await axios.get(`http://localhost:8098/api/debug/tree/${i}`);
            const treeData = res.data;
            if (!treeData || !treeData.persons) continue;
            const root = treeData.persons.find((p: any) => p.id === i);
            if (root && root.fullName && root.fullName.toLowerCase().includes('rohat')) {
                console.log(`Found Rohatoy at ID ${i}, root person name: ${root.fullName}`);
                found = true;
                break; // Just testing if we find him/her
            }
        } catch (e: any) {
            if (e.response && e.response.status === 404) {
                // ignore
            } else if (e.code === 'ECONNREFUSED') {
                console.log("Connection refused to backend!");
                break;
            }
        }
    }
    if (!found) console.log("Did not find Rohatoy.");
}

run();
