const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    businessOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "BusinessOwner",
      required: true,
    },
    subscriptionPlan: {
      type: String,
      enum: ["BASIC", "PREMIUM", "PRO"], // Define available plans
      default: "BASIC",
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      enum: ["USD", "EGP", "EUR"],
      default: "USD",
    },
    payment: {
      orderId: { type: String, required: true }, // PayPal Order ID
      status: {
        type: String,
        enum: ["PENDING", "COMPLETED", "FAILED"],
        default: "PENDING",
      },
      transactionId: {
        type: String,
      },
    },
    subscriptionActive: {
      type: Boolean,
      default: false,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
      validate: {
        validator: function (value) {
          return value > this.startDate;
        },
        message: "End date must be after the start date.",
      },
    },
  },
  { timestamps: true } // Auto-creates createdAt & updatedAt
);

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);

module.exports = Order;
