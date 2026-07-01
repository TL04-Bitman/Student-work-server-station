const success = (data = null, message = 'success') => {
  return {
    code: 200,
    message,
    data
  };
};

const error = (code = 500, message = 'error') => {
  return {
    code,
    message,
    data: null
  };
};

module.exports = {
  success,
  error
};