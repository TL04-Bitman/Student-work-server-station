const Dypnsapi = require('@alicloud/dypnsapi20170525')
const OpenApi = require('@alicloud/openapi-client')
const TeaUtil = require('@alicloud/tea-util')

const cache = {}

const Config = OpenApi.Config

const dypnsConfig = new Config({
  accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
  accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET
})
dypnsConfig.endpoint = 'dypnsapi.aliyuncs.com'

const dypnsClient = new Dypnsapi.default(dypnsConfig)

const sendSmsVerifyCode = async (phone, schemeName = '默认方案') => {
  const sendSmsVerifyCodeRequest = new Dypnsapi.SendSmsVerifyCodeRequest({
    phoneNumber: phone,
    countryCode: '86',
    signName: process.env.ALIBABA_CLOUD_SMS_SIGN_NAME,
    templateCode: process.env.ALIBABA_CLOUD_SMS_TEMPLATE_CODE,
    templateParam: '{"code":"##code##","min":"5"}',
    codeLength: 6,
    validTime: 300,
    interval: 60,
    codeType: 1,
    returnVerifyCode: true,
    duplicatePolicy: 1,
    schemeName: schemeName,
    autoRetry: 1
  })

  const runtime = new TeaUtil.RuntimeOptions({})
  
  try {
    const result = await dypnsClient.sendSmsVerifyCodeWithOptions(sendSmsVerifyCodeRequest, runtime)
    console.log(`[短信验证码发送] 结果: ${JSON.stringify(result.body)}`)
    return result.body
  } catch (error) {
    console.error('发送短信验证码失败:', error)
    throw error
  }
}

const checkSmsVerifyCode = async (phone, code, schemeName = '默认方案') => {
  const checkSmsVerifyCodeRequest = new Dypnsapi.CheckSmsVerifyCodeRequest({
    phoneNumber: phone,
    countryCode: '86',
    verifyCode: code,
    schemeName: schemeName
  })

  const runtime = new TeaUtil.RuntimeOptions({})
  
  try {
    const result = await dypnsClient.checkSmsVerifyCodeWithOptions(checkSmsVerifyCodeRequest, runtime)
    console.log(`[验证码核验] 结果: ${JSON.stringify(result.body)}`)
    return result.body
  } catch (error) {
    console.error('核验验证码失败:', error)
    throw error
  }
}

const sendLoginCode = async (phone) => {
  const result = await sendSmsVerifyCode(phone, '登录')
  
  if (result.code === 'OK' && result.model) {
    cache[`login_${phone}`] = {
      code: result.model.verifyCode,
      expiresAt: Date.now() + 5 * 60 * 1000,
      sentAt: Date.now(),
      bizId: result.model.bizId
    }
  }
  
  return {
    code: result.model?.verifyCode,
    result,
    expiresIn: 5 * 60
  }
}

const sendRegisterCode = async (phone) => {
  const result = await sendSmsVerifyCode(phone, '注册')
  
  if (result.code === 'OK' && result.model) {
    cache[`register_${phone}`] = {
      code: result.model.verifyCode,
      expiresAt: Date.now() + 5 * 60 * 1000,
      sentAt: Date.now(),
      bizId: result.model.bizId
    }
  }
  
  return {
    code: result.model?.verifyCode,
    result,
    expiresIn: 5 * 60
  }
}

const verifyLoginCode = async (phone, code) => {
  try {
    const result = await checkSmsVerifyCode(phone, code, '登录')
    
    if (result.code === 'OK' && result.success) {
      delete cache[`login_${phone}`]
      return { valid: true, message: '验证通过', result }
    }
    
    return { valid: false, message: result.message || '验证码错误', result }
  } catch (error) {
    console.error('验证登录验证码失败:', error)
    return { valid: false, message: '验证失败', error }
  }
}

const verifyRegisterCode = async (phone, code) => {
  try {
    const result = await checkSmsVerifyCode(phone, code, '注册')
    
    if (result.code === 'OK' && result.success) {
      delete cache[`register_${phone}`]
      return { valid: true, message: '验证通过', result }
    }
    
    return { valid: false, message: result.message || '验证码错误', result }
  } catch (error) {
    console.error('验证注册验证码失败:', error)
    return { valid: false, message: '验证失败', error }
  }
}

const canSendCode = (phone, type) => {
  const key = `${type}_${phone}`
  const item = cache[key]

  if (!item) {
    return true
  }

  const now = Date.now()
  const cooldown = 60 * 1000

  if (now - item.sentAt < cooldown) {
    return false
  }

  return true
}

module.exports = {
  sendLoginCode,
  sendRegisterCode,
  verifyLoginCode,
  verifyRegisterCode,
  canSendCode
}