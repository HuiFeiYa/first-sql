const sqlite = require('better-sqlite3');

let db; 
beforeAll(() => {
    db = new sqlite(':memory:');
    db.exec(`
        CREATE TABLE students (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        age INTEGER NOT NULL,
        grade INTEGER NOT NULL
        );
    
        INSERT INTO students (name, age, grade) VALUES ('Alice', 18, 12);
        INSERT INTO students (name, age, grade) VALUES ('Bob', 17, 11);
        INSERT INTO students (name, age, grade) VALUES ('Charlie', 18, 12);
        INSERT INTO students (name, age, grade) VALUES ('Alice', 16, 10);
        INSERT INTO students (name, age, grade) VALUES ('Bob', 19, 12);
    `);
});

afterAll(() => {
    db.close();
});
describe('ORDER BY、GROUP BY、LIMIT 和 DISTINCT', ()=> {

    test('ORDER BY age ASC', ()=> {
        const query = db.prepare('SELECT age FROM students ORDER BY age ASC')
        // pluck(true) 只会取第一列的值，这里只查了 age 列
        const result = query.pluck(true).all()
        expect(result).toEqual([16,17,18,18,19])
    })
    test('ORDER BY age DESC', ()=> {
        const query = db.prepare('SELECT age FROM students ORDER BY age DESC')
        // pluck(true) 只会取第一列的值，这里只查了 age 列
        const result = query.pluck(true).all()
        expect(result).toEqual([19, 18, 18, 17, 16])
    })

    test('select and group by name', () => {
        const query = db.prepare('SELECT name, COUNT(id) as count FROM students GROUP BY name')
        const result = query.all()
        expect(result).toEqual(
            [
                {name: 'Alice', count:2},
                {name: 'Bob', count:2},
                {name: 'Charlie', count:1}
            ]
        )
    });

    test('select with limit and offset', () => {
        const query = db.prepare('SELECT * FROM students ORDER BY age DESC LIMIT 1');
        const result = query.all();
        
        expect(result).toEqual([
            { id: 5, name: 'Bob', age: 19, grade: 12 }
        ]);
    });

    test('select distinct names', () => {
        const query = db.prepare('SELECT DISTINCT name FROM students');
        const result = query.all();
      
        expect(result).toEqual([
          { name: 'Alice' },
          { name: 'Bob' },
          { name: 'Charlie' },
        ]);
    });
})

describe('subquery', ()=> {

    /**
     * 1. 通过子查询，先查出排名第二的 age，注意要去重，否则无法通过 order by limit 排序获取正确的值
     * 2. 然后符合条件的 age 筛选出来
     */
    test('select students with second age', () => {
        const query = db.prepare(`
            SELECT name, age 
            FROM students
                WHERE age = (
                    SELECT DISTINCT age FROM students ORDER BY age DESC LIMIT 1,1
                )
        `)
        const result = query.all()
        expect(result).toEqual([
            { name: 'Alice', age: 18},
            { name: 'Charlie', age: 18}
        ])
    })
})