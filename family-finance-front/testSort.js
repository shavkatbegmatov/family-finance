const byGender = (target) => (_, b) => (b !== target ? -1 : 1);

const arr = ['female', 'female', 'female'];
console.log("target: male");
console.log("arr:", [...arr].sort(byGender('male')));

const arrObjs = [{ id: 1, gender: 'female' }, { id: 2, gender: 'female' }, { id: 3, gender: 'female' }];
const byGenderObj = (target) => (_, b) => (b.gender !== target ? -1 : 1);

console.log([...arrObjs].sort(byGenderObj('male')));

const arrObjs2 = [{ id: 3, gender: 'female' }, { id: 2, gender: 'female' }, { id: 1, gender: 'female' }];
console.log([...arrObjs2].sort(byGenderObj('male')));

const arrObjs3 = [{ id: 1, gender: 'female' }, { id: 3, gender: 'female' }, { id: 2, gender: 'female' }];
console.log([...arrObjs3].sort(byGenderObj('male')));
