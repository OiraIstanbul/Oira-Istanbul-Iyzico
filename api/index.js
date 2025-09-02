import Iyzipay from 'iyzipay';

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname;

  if (path === '/api') {
    return res.status(200).json({ ok: true, msg: 'Oira × Iyzico API çalışıyor' });
  }

  if (path === '/api/checkout') {
    if (req.method !== 'POST') {
      return res.status(405).json({ ok: false, error: 'Use POST' });
    }

    const iyzipay = new Iyzipay({
      apiKey: process.env.IYZICO_API_KEY,
      secretKey: process.env.IYZICO_SECRET_KEY,
      uri: process.env.IYZICO_BASE_URL
    });

    const callbackUrl =
      process.env.CALLBACK_URL || `${process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'https://oira-istanbul-iyzico.vercel.app'}/api/callback`;

    const request = {
      locale: Iyzipay.LOCALE.TR,
      conversationId: 'OIRA-' + Date.now(),
      price: '1.0',
      paidPrice: '1.0',
      currency: Iyzipay.CURRENCY.TRY,
      basketId: 'B' + Date.now(),
      paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
      callbackUrl,
      buyer: {
        id: 'BY789',
        name: 'Kayra',
        surname: 'Turkovic',
        gsmNumber: '+905300000000',
        email: 'info@oirastanbul.com',
        identityNumber: '11111111110',
        lastLoginDate: '2025-09-02 12:00:00',
        registrationDate: '2025-09-02 12:00:00',
        registrationAddress: 'Istanbul',
        ip: req.headers['x-forwarded-for'] || '85.34.78.112',
        city: 'Istanbul',
        country: 'Turkey',
        zipCode: '34000'
      },
      shippingAddress: {
        contactName: 'Kayra Turkovic',
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Istanbul',
        zipCode: '34000'
      },
      billingAddress: {
        contactName: 'Kayra Turkovic',
        city: 'Istanbul',
        country: 'Turkey',
        address: 'Istanbul',
        zipCode: '34000'
      },
      basketItems: [
        {
          id: 'SKU-TEST',
          name: 'Test Ürün',
          category1: 'Genel',
          itemType: Iyzipay.BASKET_ITEM_TYPE.PHYSICAL,
          price: '1.0'
        }
      ]
    };

    try {
      const result = await new Promise((resolve, reject) => {
        iyzipay.checkoutFormInitialize.create(request, (err, data) =>
          err ? reject(err) : resolve(data)
        );
      });

      return res.status(200).json({
        ok: true,
        conversationId: result.conversationId,
        checkoutFormContent: result.checkoutFormContent,
        paymentPageUrl: result.paymentPageUrl || null
      });
    } catch (e) {
      return res.status(500).json({ ok: false, error: e.message || e });
    }
  }

  if (path === '/api/callback') {
    return res.status(200).json({ ok: true, received: true });
  }

  return res.status(404).json({ ok: false, error: 'Not found' });
}
