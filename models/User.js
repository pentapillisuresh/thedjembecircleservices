module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
      phone: { type: DataTypes.STRING(15), allowNull: false, unique: false },
      name: { type: DataTypes.STRING, allowNull: false },
      pin: { type: DataTypes.STRING, allowNull: true }, // hashed
      email: DataTypes.STRING,
      profileImage: DataTypes.STRING,
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
    });
    return User;
  };