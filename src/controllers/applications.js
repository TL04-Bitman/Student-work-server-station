const pool = require('../config/database');
const { success, error } = require('../utils/response');

const list = async (req, res) => {
  try {
    const { page = 1, job_id, status } = req.query;
    const pageSize = 10;
    const offset = (page - 1) * pageSize;
    
    let sql = 'SELECT a.*, j.title, u.nickname, u.phone FROM applications a LEFT JOIN jobs j ON a.job_id = j.id LEFT JOIN user u ON a.student_id = u.id WHERE 1=1';
    const params = [];
    
    if (req.user.role === 'student') {
      sql += ' AND a.student_id = ?';
      params.push(req.user.userId);
    } else if (req.user.role === 'company') {
      sql += ' AND j.company_id = ?';
      params.push(req.user.userId);
    }
    
    if (job_id) {
      sql += ' AND a.job_id = ?';
      params.push(job_id);
    }
    
    if (status) {
      sql += ' AND a.status = ?';
      params.push(status);
    }
    
    sql += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);
    
    const [applications] = await pool.query(sql, params);
    
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM applications WHERE 1=1' + (req.user.role === 'student' ? ' AND student_id = ?' : req.user.role === 'company' ? ' AND job_id IN (SELECT id FROM jobs WHERE company_id = ?)' : ''), [req.user.userId]);
    
    res.json(success({
      list: applications,
      pagination: {
        page: parseInt(page),
        pageSize,
        total: countResult[0].total,
        pages: Math.ceil(countResult[0].total / pageSize)
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
    
    const [applications] = await pool.query('SELECT a.*, j.title, j.wage, j.work_time, j.location, u.nickname, u.phone, u.company_name FROM applications a LEFT JOIN jobs j ON a.job_id = j.id LEFT JOIN user u ON a.student_id = u.id WHERE a.id = ?', [id]);
    
    if (applications.length === 0) {
      return res.status(404).json(error(404, '申请不存在'));
    }
    
    const application = applications[0];
    
    if (req.user.role === 'student' && application.student_id !== req.user.userId) {
      return res.status(403).json(error(403, '无权限查看'));
    }
    
    res.json(success(application, '查询成功'));
  } catch (err) {
    console.error(err);
    res.status(500).json(error(500, '服务器错误'));
  }
};

const create = async (req, res) => {
  try {
    const { job_id } = req.body;
    const student_id = req.user.userId;
    
    if (!job_id) {
      return res.status(400).json(error(400, '请选择兼职'));
    }
    
    const [jobs] = await pool.query('SELECT * FROM jobs WHERE id = ? AND status = ?', [job_id, 'active']);
    if (jobs.length === 0) {
      return res.status(404).json(error(404, '兼职不存在或已下架'));
    }
    
    const [existing] = await pool.query('SELECT * FROM applications WHERE job_id = ? AND student_id = ?', [job_id, student_id]);
    if (existing.length > 0) {
      return res.status(400).json(error(400, '您已申请过该兼职'));
    }
    
    const [result] = await pool.query(
      'INSERT INTO applications (job_id, student_id, status) VALUES (?, ?, ?)',
      [job_id, student_id, 'pending']
    );
    
    res.status(201).json(success({ applicationId: result.insertId }, '申请成功'));
  } catch (err) {
    console.error(err);
    res.status(500).json(error(500, '服务器错误'));
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, work_hours } = req.body;
    
    const [applications] = await pool.query('SELECT a.*, j.company_id FROM applications a LEFT JOIN jobs j ON a.job_id = j.id WHERE a.id = ?', [id]);
    
    if (applications.length === 0) {
      return res.status(404).json(error(404, '申请不存在'));
    }
    
    if (applications[0].company_id !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json(error(403, '无权限操作'));
    }
    
    const [result] = await pool.query(
      'UPDATE applications SET status = COALESCE(?, status), work_hours = COALESCE(?, work_hours) WHERE id = ?',
      [status, work_hours, id]
    );
    
    res.json(success({ affectedRows: result.affectedRows }, '更新成功'));
  } catch (err) {
    console.error(err);
    res.status(500).json(error(500, '服务器错误'));
  }
};

module.exports = {
  list,
  detail,
  create,
  update
};