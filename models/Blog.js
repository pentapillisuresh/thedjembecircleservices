module.exports = (sequelize, DataTypes) => {
    const Blog = sequelize.define('Blog', {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      slug: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      excerpt: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      featuredImage: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      author: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Admin',
      },
      status: {
        type: DataTypes.ENUM('draft', 'published'),
        defaultValue: 'draft',
      },
      tags: {
        type: DataTypes.STRING, // comma‑separated
        allowNull: true,
      },
      publishedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    });
  
    Blog.associate = (models) => {
      // optional: if you want to link to admin user
      // Blog.belongsTo(models.Admin, { foreignKey: 'adminId' });
    };
  
    return Blog;
  };