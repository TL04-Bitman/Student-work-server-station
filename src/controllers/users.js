const pool = require('../config/database');
const { success, error } = require('../utils/response');

const profile = async (req, res) => {
  try {
    const [users] = await pool.query('SELECT id, phone, role, nickname, company_name, balance, created_at FROM user WHERE id = ?', [req.user.userId]);
    
    if (users.length === 0) {
      return res.status(404).json(error(404, '用户不存在'));
    }
    
    res.json(success(users[0], '查询成功'));
  } catch (err) {
    console.error(err);
    res.status(500).json(error(500, '服务器错误'));
  }
};

const updateProfile = async (req, res) => {
  try {
    const { nickname, company_name } = req.body;
    
    const [result] = await pool.query(
      'UPDATE user SET nickname = COALESCE(?, nickname), company_name = COALESCE(?, company_name) WHERE id = ?',
      [nickname, company_name, req.user.userId]
    );
    
    res.json(success({ affectedRows: result.affectedRows }, '更新成功'));
  } catch (err) {
    console.error(err);
    res.status(500).json(error(500, '服务器错误'));
  }
};

module.exports = {
  profile,
  updateProfile
};