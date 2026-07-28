module.exports = (sequelize, DataTypes) => {
  const Event = sequelize.define('Event', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
  },
    title: { type: DataTypes.STRING, allowNull: false },
    description: DataTypes.TEXT,
    date: { type: DataTypes.DATE, allowNull: false },
    venue: DataTypes.STRING,
    eventType: {
      type: DataTypes.ENUM('drumCircle', 'workshop', 'festival', 'other'),
      allowNull: false,
      defaultValue:'other'
    },
    bannerImage:{ type:DataTypes.STRING,allowNull: false},
    status: { type: DataTypes.ENUM('upcoming', 'ongoing', 'completed'), defaultValue: 'upcoming' }
  });
  return Event;
};