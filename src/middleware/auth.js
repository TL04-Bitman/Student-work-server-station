const jwt = require('jsonwebtoken');
const { secret } = require('../config/jwt');
const { error } = require('../utils/response');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(error(401, '未授权，请登录'));
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json(error(401, 'Token无效或已过期'));
  }
};

const authorize = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json(error(403, '无权限访问'));
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorize
};