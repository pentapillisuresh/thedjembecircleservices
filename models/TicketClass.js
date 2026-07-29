module.exports = (sequelize, DataTypes) => {
    const TicketClass = sequelize.define('TicketClass', {
      name: { type: DataTypes.ENUM('Premium','VIP','Economy'), allowNull: false },
      price: { type: DataTypes.FLOAT, allowNull: false },
      discountPercentage: { type: DataTypes.FLOAT, defaultValue: 0 },
      totalTickets: { type: DataTypes.INTEGER, allowNull: false },
      availableTickets: { type: DataTypes.INTEGER, allowNull: false },
      eventId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Events', key: 'id' }},
    });
    return TicketClass;
  };