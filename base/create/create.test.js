const Database = require('better-sqlite3')

const db = new Database('first-sql.db', {
    verbose:console.log
})
describe('create table ', ()=> {
    test('create user table', ()=> {
        db.exec(`
            CREATE TABLE IF NOT EXISTS user (
                id integer PRIMARY KEY AUTOINCREMENT,
                name varchar(30),
                age integer
            )
        `)

        const result = db.pragma('table_info(user)')
        expect(result[0].name).toBe('id')
        expect(result[1].name).toBe('name')
        expect(result[2].name).toBe('age')
    })
})