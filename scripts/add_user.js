const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
require('dotenv').config();

const addUser = async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  const phone = '18670750681';
  const password = '900530';
  const role = 'company';
  const nickname = '企业用户';
  const company_name = '测试企业';

  try {
    const [existingUser] = await pool.query('SELECT * FROM user WHERE phone = ?', [phone]);
    if (existingUser.length > 0) {
      console.log(`手机号 ${phone} 已存在，正在更新密码...`);
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query('UPDATE user SET password = ?, role = ?, nickname = ?, company_name = ? WHERE phone = ?', [hashedPassword, role, nickname, company_name, phone]);
      console.log(`用户 ${phone} 更新成功！`);
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const [result] = await pool.query(
        'INSERT INTO user (phone, password, role, nickname, company_name, balance) VALUES (?, ?, ?, ?, ?, ?)',
        [phone, hashedPassword, role, nickname, company_name, 0]
      );
      console.log(`用户 ${phone} 创建成功！用户ID: ${result.insertId}`);
    }
  } catch (err) {
    console.error('添加用户失败:', err);
  } finally {
    await pool.end();
  }
};

addUser();
