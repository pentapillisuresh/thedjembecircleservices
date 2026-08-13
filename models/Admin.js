module.exports = (sequelize, DataTypes) => {
    const Admin = sequelize.define('Admin', {
      phone: { type: DataTypes.STRING(15), allowNull: false, unique: false },
      name: { type: DataTypes.STRING, allowNull: false },
      pin: { type: DataTypes.STRING, allowNull: false }, 
      email: DataTypes.STRING,
      role: { type: DataTypes.ENUM('admin','employee'), defaultValue: 'admin' },
      profileImage: DataTypes.STRING,
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
    });
    return Admin;
  };
