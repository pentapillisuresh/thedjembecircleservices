const { Sequelize } = require('sequelize');
const sequelize = require('../config/database');

// Import models
const User = require('./User')(sequelize, Sequelize.DataTypes);
const Admin = require('./Admin')(sequelize, Sequelize.DataTypes);
const Event = require('./Event')(sequelize, Sequelize.DataTypes);
const TicketClass = require('./TicketClass')(sequelize, Sequelize.DataTypes);
const Order = require('./Order')(sequelize, Sequelize.DataTypes);
const OrderItem = require('./OrderItem')(sequelize, Sequelize.DataTypes);
const Gallery = require('./Gallery')(sequelize, Sequelize.DataTypes); // <-- new
const Blog = require('./Blog')(sequelize, Sequelize.DataTypes); // <-- new
const Lead = require('./Lead')(sequelize, Sequelize.DataTypes); // <-- new

// Define associations
// Event <-> TicketClass
Event.hasMany(TicketClass, { foreignKey: 'eventId', onDelete: 'CASCADE',as:"ticketClasses" });
TicketClass.belongsTo(Event, { foreignKey: 'eventId' });

// User <-> Order
User.hasMany(Order, { foreignKey: 'userId', onDelete: 'CASCADE' });
Order.belongsTo(User, { foreignKey: 'userId' });

// Event <-> Order
Event.hasMany(Order, {
  foreignKey: 'eventId',
  as: 'orders',
  onDelete: 'CASCADE'
});

Order.belongsTo(Event, {
  foreignKey: 'eventId',
  as: 'event'
});

// Order <-> OrderItem
Order.hasMany(OrderItem, {
  foreignKey: "orderId",
  as: "items",
  onDelete: "CASCADE",
});

OrderItem.belongsTo(Order, {
  foreignKey: "orderId",
  as: "order",
});

// TicketClass <-> OrderItem
TicketClass.hasMany(OrderItem, {
  foreignKey: "ticketClassId",
  as: "orderItems",
  onDelete: "CASCADE",
});

OrderItem.belongsTo(TicketClass, {
  foreignKey: "ticketClassId",
  as: "ticketClass",
});

// Gallery association
Event.hasMany(Gallery, { foreignKey: 'eventId', as: 'galleryItems', onDelete: 'CASCADE' });
Gallery.belongsTo(Event, { foreignKey: 'eventId', as: 'event' });

const db = {
  sequelize,
  Sequelize,
  User,
  Admin,
  Event,
  Lead,
  TicketClass,
  Order,
  Blog,
  OrderItem,
  Gallery
};

module.exports = db;