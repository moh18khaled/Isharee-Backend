const axios = require("axios");
const getAccessToken = require("../utils/paypalClient");
const validateUser = require("../utils/validateUser");
const sendError = require("../utils/sendError");
const BusinessOwner = require("../models/businessOwner");
const Order = require("../models/order");

const PAYPAL_API = process.env.PAYPAL_API;

// Create PayPal Order
exports.createOrder = async (req, res, next) => {
  const user = await validateUser(req, next);
  const businessOwner = await BusinessOwner.findOne({ user_id: user._id });
  console.log(businessOwner._id);

  const accessToken = await getAccessToken();

  const { amount = "10.00", currency = "USD" } = req.body;

  const response = await axios.post(
    `${PAYPAL_API}/v2/checkout/orders`,
    {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: currency,
            value: amount,
          },
        },
      ],
      application_context: {
        return_url: `${process.env.CLIENT_URL}/payment-success`,
        cancel_url: `${process.env.CLIENT_URL}/payment-cancel`,
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
        brand_name: "ishare",
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  console.log("PayPal Response:", response.data);

  // Ensure links exist before accessing them
  const approvalUrl = response.data.links?.find(
    (link) => link.rel === "approve"
  )?.href;

  if (!approvalUrl) {
    return next(sendError(404, "approval"));
  }

  // Create Order in DB (PENDING)
  const order = new Order({
    businessOwner: businessOwner._id,
    amount,
    payment: {
      orderId: response.data.id,
      status: "PENDING",
    },
    subscriptionActive: false,
    startDate: new Date(),
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)), // 1-month subscription
  });
  await order.save();
  console.log(order);

  res.json({ checkoutUrl: approvalUrl });
};

exports.captureOrder = async (req, res, next) => {
  const { orderID } = req.body;

  const order = await Order.findOne({ "payment.orderId": orderID });
  if (!order) {
    return next(sendError(404, "order"));
  }
  const businessOwnerId = order.businessOwner;

  const businessOwner = await BusinessOwner.findOne({ _id: businessOwnerId });

  const accessToken = await getAccessToken();

  const response = await axios.post(
    `${PAYPAL_API}/v2/checkout/orders/${orderID}/capture`,
    {},
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  const orderStatus = response.data.status;
  if (orderStatus !== "COMPLETED") {
    return res.status(400).json({
      error: "Payment not completed. Please check your PayPal transaction.",
      status: orderStatus,
    });
  }
  // Mark Business Owner Subscription as Active
  businessOwner.subscriptionActive = true;
  await businessOwner.save();

  // Update Order Status in DB
  order.businessOwner = businessOwner._id;
  order.payment.status = "COMPLETED";
  order.payment.transactionId = response.data?.id || "UNKNOWN"; // Handle missing ID
  order.subscriptionActive = true;
  order.amount =
    Number(
      response.data?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value
    ) || 0;

  // Ensure `endDate` is exactly one month later
  order.endDate = new Date();
  order.endDate.setUTCMonth(order.endDate.getUTCMonth() + 1);

  await order.save();

  // Send Response
  res.json({
    id: response.data?.id,
    status: response.data?.status,
    amount: order.amount,
    currency:
      response.data?.purchase_units?.[0]?.payments?.captures?.[0]?.amount
        ?.currency_code || "N/A",
    timestamp:
      response.data?.purchase_units?.[0]?.payments?.captures?.[0]
        ?.create_time || "N/A",
  });
};

//  Handle PayPal Webhook Events
exports.paypalWebhook = async (req, res, next) => {
  console.log("Webhook Event Received:", JSON.stringify(req.body, null, 2));

  // Implement logic based on webhook event type (e.g., PAYMENT.CAPTURE.COMPLETED)
  // Example: Update order status in DB

  res.sendStatus(200);
};
