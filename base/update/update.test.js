const sqlite = require('better-sqlite3');

let db; 

beforeEach(() => {
    db = new sqlite(':memory:');
    db.exec(`
        CREATE TABLE grades (
            id INTEGER PRIMARY KEY,
            name TEXT NOT NULL,
            subject varchar(10) CHECK (subject IN('math', 'chinese', 'english')),
            grade INTEGER NOT NULL
        );
        INSERT INTO grades (name,subject, grade) VALUES ('Alice', 'chinese',98);
        INSERT INTO grades (name,subject, grade) VALUES ('Alice', 'math',100);
        INSERT INTO grades (name,subject, grade) VALUES ('Alice', 'english',100);
        INSERT INTO grades (name,subject, grade) VALUES ('Blob', 'chinese',77);
        INSERT INTO grades (name,subject, grade) VALUES ('Blob', 'math',89);
        INSERT INTO grades (name,subject, grade) VALUES ('Blob', 'english',92);
    `)
})

afterAll(() => {
    db.close()
})

function update(name, subject, grade) {
    const stmt = db.prepare('UPDATE grades SET grade=? where name=? AND subject=?')
    return stmt.run( grade, name, subject)
}
function query(name, subject) {
    const query = db.prepare('SELECT * FROM grades WHERE name=? and subject=?')
    return query.get(name, subject)
}

describe('Database Update Tests', () => {
    test('Basic Update', () => {
        const targetGrade = 99
        const result = update('Alice', 'chinese', targetGrade)
        expect(result.changes).toBe(1)
        const updateRow = query('Alice', 'chinese')
        expect(updateRow.grade).toBe(targetGrade)
    });    

    test('Update Nonexistent Record', () => {
        const result = update('jack', 'math', 85)
        expect(result.changes).toBe(0); // 确保当更新不存在的记录时，变更数为0
    });

    test('Update Like Match', () => {
        const pattern = '%e';
        const targetGrade = 77
        const stmt = db.prepare(`UPDATE grades SET grade=? WHERE name LIKE ? AND subject='math'`)
        const result = stmt.run(targetGrade,pattern)
        expect(result.changes).toBe(1)
        const stmt1 = db.prepare(`SELECT * FROM grades WHERE name LIKE ? AND subject='math'`)
        const result1 = stmt1.get(pattern)
        expect(result1.grade).toBe(targetGrade)
    })

    test('Update Performance', () => {
        // 创建大型数据集
        db.exec('CREATE TABLE bigtable (id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT)');
        const stmt = db.prepare('UPDATE bigtable SET data=? WHERE id % 2 = 0')
        const startTime = new Date();

        for (let i = 0; i < 10000; i++) {
          db.prepare('INSERT INTO bigtable (data) VALUES (?)').run(`row ${i}`);
        }
    
        stmt.run('UpdatedData')
        const endTime = new Date();
    
        const timeDiff = (endTime - startTime) / 1000;
        console.log('timeDiff',timeDiff)
        expect(timeDiff).toBeLessThan(1); // 确保更新操作的性能足够快（此处假设1秒以内为正常）
    });

    test('Concurrent Update', async () => {
        const updateTwoRows = db.transaction(() => {
            update('Alice', 'math', 100);
            update('Alice', 'math', 60);
        })
        updateTwoRows()
        const row = query('Alice', 'math')
        expect(row.grade).toBe(60)
    })
    test('Concurrent Update Error', async ()=> {
        const updateTwoRows = db.transaction(() => {
            update('Alice', 'math', 100);
            throw new Error('一个意外')
            update('Alice', 'math', 60);
        })
        try {
            updateTwoRows()
        } catch (error){
            console.log('error', error.message)
        }
        const row = query('Alice', 'math')
        expect(row.grade).toBe(100)
    })
})