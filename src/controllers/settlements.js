const pool = require('../config/database');
const { success, error } = require('../utils/response');

const list = async (req, res) => {
  try {
    const { page = 1, application_id } = req.query;
    const pageSize = 10;
    const offset = (page - 1) * pageSize;
    
    let sql = 'SELECT s.*, a.job_id, j.title, u.nickname, u.phone FROM settlements s LEFT JOIN applications a ON s.application_id = a.id LEFT JOIN jobs j ON a.job_id = j.id LEFT JOIN user u ON a.student_id = u.id WHERE 1=1';
    const params = [];
    
    if (req.user.role === 'student') {
      sql += ' AND a.student_id = ?';
      params.push(req.user.userId);
    } else if (req.user.role === 'company') {
      sql += ' AND j.company_id = ?';
      params.push(req.user.userId);
    }
    
    if (application_id) {
      sql += ' AND s.application_id = ?';
      params.push(application_id);
    }
    
    sql += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);
    
    const [settlements] = await pool.query(sql, params);
    
    res.json(success({
      list: settlements,
      pagination: {
        page: parseInt(page),
        pageSize,
        total: settlements.length
      }
    }, '查询成功'));
  } catch (err) {
    console.error(err);
    res.status(500).json(error(500, '服务器错误'));
  }
};

const detail = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [settlements] = await pool.query('SELECT s.*, a.job_id, a.student_id, a.work_hours, j.title, j.wage, u.nickname, u.phone FROM settlements s LEFT JOIN applications a ON s.application_id = a.id LEFT JOIN jobs j ON a.job_id = j.id LEFT JOIN user u ON a.student_id = u.id WHERE s.id = ?', [id]);
    
    if (settlements.length === 0) {
      return res.status(404).json(error(404, '结算记录不存在'));
    }
    
    res.json(success(settlements[0], '查询成功'));
  } catch (err) {
    console.error(err);
    res.status(500).json(error(500, '服务器错误'));
  }
};

const create = async (req, res) => {
  try {
    const { application_id, amount } = req.body;
    
    if (!application_id) {
      return res.status(400).json(error(400, '请选择申请记录'));
    }
    
    const [applications] = await pool.query('SELECT a.*, j.company_id, j.wage FROM applications a LEFT JOIN jobs j ON a.job_id = j.id WHERE a.id = ?', [application_id]);
    
    if (applications.length === 0) {
      return res.status(404).json(error(404, '申请记录不存在'));
    }
    
    const application = applications[0];
    
    if (application.company_id !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json(error(403, '无权限操作'));
    }
    
    if (application.status !== 'approved') {
      return res.status(400).json(error(400, '申请未通过，无法结算'));
    }
    
    const [existing] = await pool.query('SELECT * FROM settlements WHERE application_id = ?', [application_id]);
    if (existing.length > 0) {
      return res.status(400).json(error(400, '该申请已结算'));
    }
    
    const settlementAmount = amount || (application.work_hours || 1) * application.wage;
    
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    
    try {
      await connection.query(
        'INSERT INTO settlements (application_id, amount, status) VALUES (?, ?, ?)',
        [application_id, settlementAmount, 'completed']
      );
      
      await connection.query(
        'UPDATE user SET balance = balance + ? WHERE id = ?',
        [settlementAmount, application.student_id]
      );
      
      await connection.query(
        'UPDATE applications SET status = ? WHERE id = ?',
        ['settled', application_id]
      );
      
      await connection.commit();
      
      res.status(201).json(success({ amount: settlementAmount }, '结算成功'));
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json(error(500, '服务器错误'));
  }
};

module.exports = {
  list,
  detail,
  create
};