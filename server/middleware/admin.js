const supabase = require('../config/supabase');
const adminMiddleware = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required.' });
    }
    if (req.user.userType !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Access is restricted to administrators.' });
    }
    const { data: admin, error } = await supabase
      .from('admins')
      .select('*')
      .eq('id', req.user.userId)
      .maybeSingle();

    if (!admin || error) {
      return res.status(404).json({ message: 'Admin user not found.' });
    }
    next();

  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ message: 'Server error during admin verification.' });
  }
};

module.exports = adminMiddleware;
