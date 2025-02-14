const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the User model
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the User model
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [1, "Transaction amount must be at least 1."],
    },
    currency: {
      type: String,
      enum: ["EGP", "USD", "EUR"],
      default: "EGP",
    },
    walletType: {
      type: String,
      enum: [
        "Vodafone Cash",
        "Etisalat Cash",
        "Orange Cash",
        "WE Pay",
        "Meeza",
        "Fawry Wallet",
        "BM Wallet",
        "CIB Smart Wallet",
        "Ahly Phone Cash",
        "QNB Mobile Wallet",
        "Alex Bank Mobile Wallet",
        "ADIB Wallet",
        "ValU",
      ],
      required: true,
    },
    transactionId: {
      type: String,
      unique: true,
      required: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "COMPLETED", "FAILED"],
      default: "PENDING",
    },
    description: {
      type: String,
      maxlength: 255,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
    },
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;