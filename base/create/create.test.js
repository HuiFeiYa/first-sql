const Database = require('better-sqlite3')

// 测试数据库连接
test('Database connection', () => {
    const db = new Database(':memory:'); // 在内存中创建临时数据库
    expect(db.open).toBeTruthy(); // 检查数据库是否成功打开
    db.close(); // 关闭数据库连接
});
/**
 * 
 */

describe('Database creation and deletion ', () => {
    let db;

    beforeEach(() => {
      // 每执行一个 test，都会创建一个临时数据库用于测试
      db = new Database(':memory:');
    });
    test('create user table', () => {
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

    test('delete shop table', () => {
        db.exec(`
            CREATE TABLE IF NOT EXISTS shop (
                id integer PRIMARY KEY AUTOINCREMENT,
                shop varchar(30),
                address varchar(30)
            )
        `)

        db.exec('DROP TABLE IF EXISTS shop')
        const result = db.pragma('table_info(shop)')
        expect(result).toHaveLength(0)
    })
})



describe('FOREIGN KEY constraint', () => {
    let db;
  
    beforeAll(() => {
      db = new Database(':memory:');
      /**
       * 启用外键约束的命令
       * SQLite 默认情况下是不启用外键约束的，这意味着你可以在表中插入任何值，而不会检查其关联的外键约束。
       */
      db.pragma('foreign_keys = ON'); 
      db.exec(`
        CREATE TABLE IF NOT EXISTS departments (
          id INTEGER PRIMARY KEY,
          name TEXT
        );
  
        CREATE TABLE IF NOT EXISTS employees (
          id INTEGER PRIMARY KEY,
          name TEXT,
          department_id INTEGER,
          FOREIGN KEY (department_id) REFERENCES departments(id)
        );
      `);
    });
  
    afterAll(() => {
      db.close();
    });
  
    afterEach(() => {
      db.exec('DELETE FROM employees');
      db.exec('DELETE FROM departments');
    });
    // departments 主表 employees 子表
    test('insert employee with valid department_id', () => {
      // 插入部门数据
      const { lastInsertRowid: departmentId } = db.prepare('INSERT INTO departments (name) VALUES (?)').run('IT');
  
      // 插入员工数据
      const { changes } = db.prepare('INSERT INTO employees (name, department_id) VALUES (?, ?)').run('Alice', departmentId);
  
      expect(changes).toBe(1);
    });
  
    test('insert employee with invalid department_id', () => {
        try {
            // 尝试插入一个不存在的部门 ID
            const { changes } = db.prepare('INSERT INTO employees (name, department_id) VALUES (?, ?)').run('Bob', 999);
            // 预期插入失败，因为 department_id 不存在
            expect(changes).toBe(0);
        } catch (error) {
            // 预期插入失败，因为 department_id 不存在
            expect(error.code).toContain("SQLITE_CONSTRAINT_FOREIGNKEY");
        }
    });
  });
