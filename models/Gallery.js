module.exports = (sequelize, DataTypes) => {
    const Gallery = sequelize.define('Gallery', {
      eventId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'If null, it is a general image/video; otherwise linked to an event'
      },
      mediaType: {
        type: DataTypes.ENUM('image', 'video'),
        allowNull: false
      },
      galleryType: {
        type: DataTypes.ENUM('event', 'others'),
        allowNull: false
      },
      mediaUrl: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'File path or full URL returned by upload API'
      },
      caption: {
        type: DataTypes.STRING,
        allowNull: true
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      }
    });
  
    Gallery.associate = (models) => {
      Gallery.belongsTo(models.Event, { foreignKey: 'eventId', as: 'event' });
    };
  
    return Gallery;
  };