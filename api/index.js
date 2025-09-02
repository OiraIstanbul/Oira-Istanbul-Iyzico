import express from "express";
import bodyParser from "body-parser";
import Iyzipay from "iyzipay";
import axios from "axios";

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const iyzipay = new Iyzipay({
  apiKey: process.env.IYZICO_API_KEY,
  secretKey: process.env.IYZICO_SECRET_KEY,
  uri: process.env.IYZICO_BASE_URL
});

const SHOP = process.env.SHOPIFY_SHOP;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_TOKEN;

app.post("/checkout/iyzico", async (req, res) => {
  try {
    const {
      totalPrice,
      email,
      firstName,
      lastName,
      address,
      city,
      zip
    } = req.body;

    const price = Number(totalPrice).toFixed(2);

    const request = {
      locale: Iyzipay.LOCALE.TR,
      conversationId: "oira-" + Date.now(),
      price,
      paidPrice: price,
      currency: Iyzipay.CURRENCY.TRY,
      installment: 1,
      basketId: "basket-" + Date.now(),
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
      callbackUrl: process.env.CALLBACK_URL,
      buyer: {
        id: "buyer-" + Date.now(),
        name: firstName || "Musteri",
        surname: lastName || "Soyad",
        gsmNumber: "+905555555555",
        email: email || "musteri@example.com",
        identityNumber: "11111111111",
        lastLoginDate: "2025-09-02 12:00:00",
        registrationDate: "2025-07-01 12:00:00",
        registrationAddress: address || "Adres",
        ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
        city: city || "Istanbul",
        country: "Turkey",
        zipCode: zip || "34000"
      },
      shippingAddress: {
        contactName: `${firstName || "Musteri"} ${lastName || "Soyad"}`,
        city: city || "Istanbul",
        country: "Turkey",
        address: address || "Adres",
        zipCode: zip || "34000"
      },
      billingAddress: {
        contactName: `${firstName || "Musteri"} ${lastName || "Soyad"}`,
        city: city || "Istanbul",
        country: "Turkey",
        address: address || "Adres",
        zipCode: zip || "34000"
      },
      basketItems: [
        {
          id: "oira-basket",
          name: "Oira Siparişi",
          category1: "Giyim",
          itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
          price
        }
      ]
    };

    Iyzipay.CheckoutFormInitialize.create(request, (err, result) => {
      if (err) return res.status(500).send("Iyzico hata");
      if (result?.paymentPageUrl) return res.redirect(result.paymentPageUrl);
      return res.send(result.checkoutFormContent);
    });
  } catch (e) {
    res.status(500).send("Sunucu hata: " + e.message);
  }
});

app.post("/iyzico/callback", async (req, res) => {
  try {
    const token = req.body.token;
    if (!token) return res.redirect("/cart?payment=missing_token");

    Iyzipay.CheckoutForm.retrieve({ token }, async (err, result) => {
      if (err) return res.redirect("/cart?payment=iyzico_error");

      if (result.paymentStatus === "SUCCESS") {
        const paidPrice = parseFloat(result.paidPrice);

        const orderResp = await axios.post(
          `https://${SHOP}/admin/api/2024-07/orders.json`,
          {
            order: {
              financial_status: "paid",
              gateway: "iyzico",
              note: `iyzico paymentId: ${result.paymentId}`,
              line_items: [
                { title: "Oira Order", price: paidPrice, quantity: 1 }
              ]
            }
          },
          { headers: { "X-Shopify-Access-Token": ADMIN_TOKEN } }
        );

        const orderId = orderResp.data?.order?.id;
        return res.redirect(`/orders/thanks?order_id=${orderId || ""}`);
      } else {
        return res.redirect("/cart?payment=failed");
      }
    });
  } catch {
    return res.redirect("/cart?payment=callback_error");
  }
});

export default app;