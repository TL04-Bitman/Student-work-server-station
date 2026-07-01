const pool = require('../config/database');
const { success, error } = require('../utils/response');

const list = async (req, res) => {
  try {
    const { page = 1, type = '日结', keyword = '', status = 'active' } = req.query;
    const pageSize = 10;
    const offset = (page - 1) * pageSize;
    
    let sql = 'SELECT j.*, u.company_name FROM jobs j LEFT JOIN user u ON j.company_id = u.id WHERE j.status = ?';
    const params = [status];
    
    if (type) {
      sql += ' AND j.type = ?';
      params.push(type);
    }
    
    if (keyword) {
      sql += ' AND (j.title LIKE ? OR j.description LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }
    
    sql += ' ORDER BY j.created_at DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);
    
    const [jobs] = await pool.query(sql, params);
    
    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM jobs WHERE status = ?', [status]);
    
    res.json(success({
      list: jobs,
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
    
    const [jobs] = await pool.query('SELECT j.*, u.company_name, u.nickname FROM jobs j LEFT JOIN user u ON j.company_id = u.id WHERE j.id = ?', [id]);
    
    if (jobs.length === 0) {
      return res.status(404).json(error(404, '兼职不存在'));
    }
    
    res.json(success(jobs[0], '查询成功'));
  } catch (err) {
    console.error(err);
    res.status(500).json(error(500, '服务器错误'));
  }
};

const create = async (req, res) => {
  try {
    const { title, description, type, wage, work_time, requirements, location } = req.body;
    const company_id = req.user.userId;
    
    if (!title || !description || !wage || !work_time) {
      return res.status(400).json(error(400, '请填写必填字段'));
    }
    
    const [result] = await pool.query(
      'INSERT INTO jobs (title, description, type, wage, work_time, requirements, location, company_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, description, type || '日结', wage, work_time, requirements || '', location || '', company_id, 'active']
    );
    
    res.status(201).json(success({ jobId: result.insertId }, '发布成功'));
  } catch (err) {
    console.error(err);
    res.status(500).json(error(500, '服务器错误'));
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, type, wage, work_time, requirements, location, status } = req.body;
    
    const [jobs] = await pool.query('SELECT * FROM jobs WHERE id = ?', [id]);
    if (jobs.length === 0) {
      return res.status(404).json(error(404, '兼职不存在'));
    }
    
    if (jobs[0].company_id !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json(error(403, '无权限修改'));
    }
    
    const [result] = await pool.query(
      'UPDATE jobs SET title = COALESCE(?, title), description = COALESCE(?, description), type = COALESCE(?, type), wage = COALESCE(?, wage), work_time = COALESCE(?, work_time), requirements = COALESCE(?, requirements), location = COALESCE(?, location), status = COALESCE(?, status) WHERE id = ?',
      [title, description, type, wage, work_time, requirements, location, status, id]
    );
    
    res.json(success({ affectedRows: result.affectedRows }, '更新成功'));
  } catch (err) {
    console.error(err);
    res.status(500).json(error(500, '服务器错误'));
  }
};

const deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [jobs] = await pool.query('SELECT * FROM jobs WHERE id = ?', [id]);
    if (jobs.length === 0) {
      return res.status(404).json(error(404, '兼职不存在'));
    }
    
    if (jobs[0].company_id !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json(error(403, '无权限删除'));
    }
    
    await pool.query('UPDATE jobs SET status = ? WHERE id = ?', ['deleted', id]);
    
    res.json(success(null, '删除成功'));
  } catch (err) {
    console.error(err);
    res.status(500).json(error(500, '服务器错误'));
  }
};

module.exports = {
  list,
  detail,
  create,
  update,
  delete: deleteJob
};