const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { User } = require('./models');

// JWT密钥 - 生产环境应该放在环境变量中
const JWT_SECRET = process.env.JWT_SECRET || 'domain-system-secret-2024';

// 密码强度验证
const validatePassword = (password) => {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('密码长度至少8位');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('密码须包含大写字母');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('密码须包含小写字母');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('密码须包含数字');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('密码须包含特殊字符');
  }
  
  // 常见弱密码检查
  const weakPasswords = [
    '12345678', '87654321', 'password', 'Password123', 
    'admin123', 'qwerty123', '123456789', 'abcd1234',
    'password1', 'Password1', '11111111', '00000000'
  ];
  
  if (weakPasswords.includes(password)) {
    errors.push('密码过于简单，请使用更复杂的密码');
  }
  
  return errors;
};

// 生成JWT令牌
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '24h' });
};

// 验证JWT令牌
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// 认证中间件
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: '访问被拒绝，请先登录' });
    }
    
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: '令牌无效' });
    }
    
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: '认证失败' });
  }
};

// 注册
const register = async (req, res) => {
  try {
    const { username, email, password, inviteCode } = req.body;
    
    // 邀请码验证 - 简单的管理机制
    const validInviteCodes = ['DOMAIN2024', 'ADMIN2024'];
    if (!validInviteCodes.includes(inviteCode)) {
      return res.status(400).json({ error: '邀请码无效' });
    }
    
    // 验证必填字段
    if (!username || !email || !password) {
      return res.status(400).json({ error: '用户名、邮箱和密码为必填项' });
    }
    
    // 密码强度验证
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ 
        error: '密码不符合要求',
        details: passwordErrors
      });
    }
    
    // 检查用户是否已存在
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        error: existingUser.email === email ? '邮箱已被注册' : '用户名已被使用'
      });
    }
    
    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // 创建用户
    const user = new User({
      username,
      email,
      password: hashedPassword,
      role: 'user'
    });
    
    await user.save();
    
    // 生成令牌
    const token = generateToken(user._id);
    
    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: '注册失败：' + error.message });
  }
};

// 登录
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码为必填项' });
    }
    
    // 查找用户
    const user = await User.findOne({ 
      $or: [{ email }, { username: email }] 
    });
    
    if (!user) {
      return res.status(400).json({ error: '用户不存在' });
    }
    
    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: '密码错误' });
    }
    
    // 更新最后登录时间
    user.lastLoginAt = new Date();
    await user.save();
    
    // 生成令牌
    const token = generateToken(user._id);
    
    res.json({
      message: '登录成功',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role
      }
    });
    
  } catch (error) {
    res.status(500).json({ error: '登录失败：' + error.message });
  }
};

// 获取当前用户信息
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: '获取用户信息失败' });
  }
};

module.exports = {
  authMiddleware,
  register,
  login,
  getCurrentUser,
  validatePassword
};
