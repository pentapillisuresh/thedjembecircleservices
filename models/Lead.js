module.exports = (sequelize, DataTypes) => {
    const Lead = sequelize.define('Lead', {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isEmail: true },
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      eventInterested: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Event name or ID they are interested in',
      },
      source: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Where they came from: website, social, etc.',
      },
      status: {
        type: DataTypes.ENUM('new', 'contacted', 'converted', 'lost'),
        defaultValue: 'new',
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Admin notes',
      },
    });
  
    return Lead;
  };