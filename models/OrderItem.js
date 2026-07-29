module.exports = (sequelize, DataTypes) => {
    const OrderItem = sequelize.define('OrderItem', {
      orderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'Orders', key: 'id' }
      },
      ticketClassId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'TicketClasses', key: 'id' }
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: { min: 1 }
      },
      // 🛡️ SNAPSHOT fields (critical for accounting)
      // These freeze the price/discount at the time of purchase,
      // so even if the admin changes the event price later, 
      // the customer's receipt stays accurate.
      priceAtTime: {
        type: DataTypes.FLOAT,
        allowNull: false,
        comment: 'Price of 1 ticket for this class at the time of booking'
      },
      discountPercentageAtTime: {
        type: DataTypes.FLOAT,
        defaultValue: 0,
        comment: 'Discount applied to this class at the time of booking'
      },
      subtotal: {
        type: DataTypes.FLOAT,
        allowNull: false,
        comment: 'quantity * priceAtTime * (1 - discountPercentageAtTime/100)'
      }
    });
  
    return OrderItem;
  };