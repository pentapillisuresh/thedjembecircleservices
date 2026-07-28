const bcrypt = require('bcryptjs');
const { Admin } = require('../models');

module.exports = async () => {
  const adminExists = await Admin.findOne({ where: { phone: '9999999999' } });
  if (!adminExists) {
    const hashedPin = await bcrypt.hash('admin123', 10);
    await Admin.create({
      phone: '9999999999',
      name: 'Super Admin',
      pin: hashedPin,
      email: 'admin@drum.com',
      role: 'admin'
    });
    console.log('✅ Admin seeded');
  }
};