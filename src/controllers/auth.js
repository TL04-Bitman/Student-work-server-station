const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const { secret, expiresIn } = require('../config/jwt');
const { success, error } = require('../utils/response');
const { sendLoginCode: smsSendLoginCode, sendRegisterCode: smsSendRegisterCode, verifyLoginCode, verifyRegisterCode, canSendCode } = require('../utils/sms');

const register = async (req, res) => {
  try {
    const { phone, password, role, nickname, company_name, smsCode } = req.body;
    
    if (!phone || !password || !role) {
      return res.status(400).json(error(400, '请填写必填字段'));
    }

    if (!smsCode) {
      return res.status(400).json(error(400, '请输入验证码'));
    }

    const verifyResult = await verifyRegisterCode(phone, smsCode);
    if (!verifyResult.valid) {
      return res.status(400).json(error(400, verifyResult.message));
    }
    
    const [existingUser] = await pool.query('SELECT * FROM user WHERE phone = ?', [phone]);
    if (existingUser.length > 0) {
      return res.status(400).json(error(400, '该手机号已注册'));
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      'INSERT INTO user (phone, password, role, nickname, company_name, balance) VALUES (?, ?, ?, ?, ?, ?)',
      [phone, hashedPassword, role, nickname || '', company_name || '', 0]
    );
    
    res.status(201).json(success({ userId: result.insertId }, '注册成功'));
  } catch (err) {
    console.error(err);
    res.status(500).json(error(500, '服务器错误'));
  }
};

const login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    
    if (!phone || !password) {
      return res.status(400).json(error(400, '请填写手机号和密码'));
    }
    
    const [users] = await pool.query('SELECT * FROM user WHERE phone = ?', [phone]);
    if (users.length === 0) {
      return res.status(400).json(error(400, '手机号或密码错误'));
    }
    
    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return res.status(400).json(error(400, '手机号或密码错误'));
    }
    
    const token = jwt.sign({ userId: user.id, role: user.role }, secret, { expiresIn });
    
    res.json(success({ token, user: { id: user.id, phone: user.phone, role: user.role, nickname: user.nickname, company_name: user.company_name, balance: user.balance } }, '登录成功'));
  } catch (err) {
    console.error(err);
    res.status(500).json(error(500, '服务器错误'));
  }
};

const handleSendLoginCode = async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json(error(400, '请输入手机号'));
    }

    if (!canSendCode(phone, 'login')) {
      return res.status(400).json(error(400, '发送过于频繁，请稍后再试'));
    }

    const [users] = await pool.query('SELECT * FROM user WHERE phone = ?', [phone]);
    if (users.length === 0) {
      return res.status(400).json(error(400, '该手机号未注册'));
    }

    const result = await smsSendLoginCode(phone);
    
    res.json(success({ expiresIn: result.expiresIn }, '验证码发送成功'));
  } catch (err) {
    console.error(err);
    res.status(500).json(error(500, '发送验证码失败'));
  }
};

const handleSendRegisterCode = async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json(error(400, '请输入手机号'));
    }

    if (!canSendCode(phone, 'register')) {
      return res.status(400).json(error(400, '发送过于频繁，请稍后再试'));
    }

    const [users] = await pool.query('SELECT * FROM user WHERE phone = ?', [phone]);
    if (users.length > 0) {
      return res.status(400).json(error(400, '该手机号已注册'));
    }

    const result = await smsSendRegisterCode(phone);
    
    res.json(success({ expiresIn: result.expiresIn }, '验证码发送成功'));
  } catch (err) {
    console.error(err);
    res.status(500).json(error(500, '发送验证码失败'));
  }
};

const handleLoginBySms = async (req, res) => {
  try {
    const { phone, smsCode } = req.body;
    
    if (!phone || !smsCode) {
      return res.status(400).json(error(400, '请填写手机号和验证码'));
    }

    const verifyResult = await verifyLoginCode(phone, smsCode);
    if (!verifyResult.valid) {
      return res.status(400).json(error(400, verifyResult.message));
    }
    
    const [users] = await pool.query('SELECT * FROM user WHERE phone = ?', [phone]);
    if (users.length === 0) {
      return res.status(400).json(error(400, '该手机号未注册'));
    }
    
    const user = users[0];
    const token = jwt.sign({ userId: user.id, role: user.role }, secret, { expiresIn });
    
    res.json(success({ token, user: { id: user.id, phone: user.phone, role: user.role, nickname: user.nickname, company_name: user.company_name, balance: user.balance } }, '登录成功'));
  } catch (err) {
    console.error(err);
    res.status(500).json(error(500, '服务器错误'));
  }
};

const handleCheckPhone = async (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json(error(400, '请输入手机号'));
    }

    const result = await verifyPhoneNumber(phone);
    
    res.json(success({ result }, '号码验证成功'));
  } catch (err) {
    console.error(err);
    res.status(500).json(error(500, '号码验证失败'));
  }
};

module.exports = {
  register,
  login,
  sendLoginCode: handleSendLoginCode,
  sendRegisterCode: handleSendRegisterCode,
  loginBySms: handleLoginBySms,
  checkPhone: handleCheckPhone
};