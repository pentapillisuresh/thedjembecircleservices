// Order.js
module.exports = (sequelize, DataTypes) => {
    const Order = sequelize.define('Order', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
    userId: { type: DataTypes.INTEGER, allowNull: false,references: { model: 'Users', key: 'id' } },
    eventId: { type: DataTypes.INTEGER, allowNull: false, references: { model: 'Events', key: 'id' }},
    totalAmount: { type: DataTypes.FLOAT, allowNull: false },
    status: { type: DataTypes.ENUM('pending','paid','failed','refunded'), defaultValue: 'pending' },
    razorpayOrderId: DataTypes.STRING,
    razorpayPaymentId: DataTypes.STRING,
    razorpaySignature: DataTypes.STRING
});
return Order;
};