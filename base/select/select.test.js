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

        CREATE TABLE grades (
            id INTEGER PRIMARY KEY,
            student_id INTEGER,
            subject TEXT NOT NULL,
            score INTEGER NOT NULL,
            FOREIGN KEY (student_id) REFERENCES students(id)
        );
        INSERT INTO grades (student_id, subject, score) VALUES (1, 'Math', 85);
        INSERT INTO grades (student_id, subject, score) VALUES (2, 'Math', 78);
        INSERT INTO grades (student_id, subject, score) VALUES (3, 'Math', 92);
        INSERT INTO grades (student_id, subject, score) VALUES (4, 'Math', 79);
        INSERT INTO grades (student_id, subject, score) VALUES (5, 'Math', 88);

    `);
});

afterAll(() => {
    db.close();
});
describe('ORDER BY、GROUP BY、LIMIT、 DISTINCT、AND、OR、NOT、Like', ()=> {
    test('AND',() => {
        const query = db.prepare(`SELECT name, age,grade FROM students where name='Alice' AND age=18`)
        const result = query.all()
        expect(result).toHaveLength(1) // 只命中1条
        expect(result).toEqual([{name: 'Alice',age:18,grade:12}])
    })
    test('OR',() => {
        const query = db.prepare(`SELECT name, age FROM students WHERE name='Charlie' OR age > 18`)
        const result = query.all()
        expect(result).toHaveLength(2) // 命中2条
        expect(result).toEqual([{name: 'Charlie',age:18}, {name: 'Bob',age:19}])
    })
    test('NOT',() => {
        const query = db.prepare(`SELECT name, age FROM students WHERE name NOT IN('Alice','Charlie')`)
        const result = query.all()
        expect(result).toHaveLength(2)
        expect(result).toEqual([{name: 'Bob',age:17}, {name: 'Bob', age: 19}])
    })
    test('Like',() => {
        // 不区分大小写，查询包含 c 字母的名称
        const query = db.prepare(`SELECT name FROM students WHERE UPPER(name) LIKE UPPER('%c%')`)
        const result = query.all()
        expect(result).toHaveLength(3)
        expect(result).toEqual([
            {name: 'Alice'},
            {name: 'Charlie'},
            {name: 'Alice'}
        ])
    })

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

describe('subQuery', ()=> {

    /**
     * 1. 通过子查询，先查出排名第二的 age，注意要去重，否则无法通过 order by limit 排序获取正确的值
     * 2. 筛选符合条件的 age
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

    /**
     * 查询大于平均年龄的学生信息
     * 1. 子查询查出平均年龄
     * 2. 筛选符合条件的数据
     */
    
    test('query the student information of those whose age is greater than the average age', () => {
        const query = db.prepare(`
            SELECT name, grade 
            FROM students 
            WHERE grade > (
                SELECT AVG(grade) 
                FROM students
            )
        `)
        const result = query.all()
        expect(result).toEqual([
            {name: 'Alice', grade: 12},
            {name: 'Charlie', grade: 12},
            {name: 'Bob', grade: 12},
        ])

    })
})

describe('join', () => {
    test('To query the grades of each student with inner join', () => {
        const query = db.prepare(`
            SELECT s.name,s.age, g.subject, g.score
            FROM students as s
            INNER JOIN grades as g
            ON s.id = student_id
        `)
        const result = query.all()
        expect(result).toEqual([
            {name:'Alice', age: 18, subject: 'Math', score: 85},
            {name:'Bob', age: 17, subject: 'Math', score: 78},
            {name:'Charlie', age: 18, subject: 'Math', score: 92},
            {name:'Alice', age: 16, subject: 'Math', score: 79},
            {name:'Bob', age: 19, subject: 'Math', score: 88}
        ])
    })
    test('To query the grades of each student with left join', () => {
        const query = db.prepare(`
            SELECT s.name,s.age, g.subject, g.score
            FROM students as s
            LEFT JOIN grades as g
            ON s.id = student_id
        `)
        const result = query.all()
        expect(result).toEqual([
            {name:'Alice', age: 18, subject: 'Math', score: 85},
            {name:'Bob', age: 17, subject: 'Math', score: 78},
            {name:'Charlie', age: 18, subject: 'Math', score: 92},
            {name:'Alice', age: 16, subject: 'Math', score: 79},
            {name:'Bob', age: 19, subject: 'Math', score: 88}
        ])
    })
    test('To query the grades of each student with right join', () => {
        const query = db.prepare(`
            SELECT s.name,s.age, g.subject, g.score
            FROM students as s
            RIGHT JOIN grades as g
            ON s.id = student_id
        `)
        const result = query.all()
        expect(result).toEqual([
            {name:'Alice', age: 18, subject: 'Math', score: 85},
            {name:'Bob', age: 17, subject: 'Math', score: 78},
            {name:'Charlie', age: 18, subject: 'Math', score: 92},
            {name:'Alice', age: 16, subject: 'Math', score: 79},
            {name:'Bob', age: 19, subject: 'Math', score: 88}
        ])
    })

})