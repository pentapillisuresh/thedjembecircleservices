// models/Order.js
module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define('Order', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: { 
      type: DataTypes.INTEGER, 
      allowNull: false,
      references: { model: 'Users', key: 'id' } 
    },
    eventId: { 
      type: DataTypes.INTEGER, 
      allowNull: false, 
      references: { model: 'Events', key: 'id' }
    },
    totalAmount: { 
      type: DataTypes.FLOAT, 
      allowNull: false 
    },
    originalAmount: { 
      type: DataTypes.FLOAT, 
      allowNull: true,
      comment: 'Original amount before any discounts'
    },
    couponCode: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Coupon code applied to this order'
    },
    couponDiscountAmount: { 
      type: DataTypes.FLOAT, 
      allowNull: true, 
      defaultValue: 0,
      comment: 'Discount amount applied from coupon'
    },
    discountPercentage: { 
      type: DataTypes.FLOAT, 
      allowNull: true, 
      defaultValue: 0,
      comment: 'Discount percentage applied'
    },
    status: { 
      type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded', 'cancelled'), 
      defaultValue: 'pending' 
    },
    razorpayOrderId: { 
      type: DataTypes.STRING,
      allowNull: true 
    },
    orderFilePath: { 
      type: DataTypes.STRING,
      allowNull: true,
    },
    razorpayPaymentId: { 
      type: DataTypes.STRING,
      allowNull: true 
    },
    razorpaySignature: { 
      type: DataTypes.STRING,
      allowNull: true 
    },
    paidAt: { 
      type: DataTypes.DATE, 
      allowNull: true,
      comment: 'When the order was paid'
    }
  });

  return Order;
};