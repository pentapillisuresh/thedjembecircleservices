const slugify = require('slugify');// or wherever your slugify comes from

module.exports = (sequelize, DataTypes) => {
  const Event = sequelize.define(
    "Event",
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },

      title: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      slug: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },

      // Event date/time
      date: {
        type: DataTypes.DATE,
        allowNull: false,
      },

      venue: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      amenities: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],

        get() {
          const value = this.getDataValue("amenities");

          if (!value) {
            return [];
          }

          try {
            return typeof value === "string"
              ? JSON.parse(value)
              : value;
          } catch (err) {
            console.error("Invalid amenities JSON:", value);
            return [];
          }
        },

        set(value) {
          if (Array.isArray(value)) {
            this.setDataValue("amenities", value);
            return;
          }

          if (typeof value === "string") {
            try {
              const parsed = JSON.parse(value);

              this.setDataValue(
                "amenities",
                Array.isArray(parsed) ? parsed : []
              );
            } catch (err) {
              this.setDataValue("amenities", []);
            }

            return;
          }

          this.setDataValue("amenities", []);
        },
      },

      eventType: {
        type: DataTypes.ENUM(
          "drumCircle",
          "workshop",
          "festival",
          "other"
        ),
        allowNull: false,
        defaultValue: "other",
      },

      bannerImage: {
        type: DataTypes.STRING,
        allowNull: false,
      },

      status: {
        type: DataTypes.ENUM(
          "upcoming",
          "ongoing",
          "completed"
        ),
        allowNull: false,
        defaultValue: "upcoming",
      },
    },

    {
      tableName: "Events",

      hooks: {
        beforeValidate: (event) => {
          if (event.title) {
            event.slug = slugify(event.title, {
              lower: true,
              strict: true,
              replacement: "-",
            });
          }
        },

        beforeUpdate: (event) => {
          if (event.changed("title")) {
            event.slug = slugify(event.title, {
              lower: true,
              strict: true,
              replacement: "-",
            });
          }
        },
      },
    }
  );

  return Event;
};