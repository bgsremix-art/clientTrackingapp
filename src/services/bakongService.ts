import { KHQR, CURRENCY, TAG, COUNTRY } from 'ts-khqr';
import md5 from 'md5';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const BAKONG_TOKEN_FALLBACK = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJkYXRhIjp7ImlkIjoiYmU3ODdjMjFiMzE0NDUyNyJ9LCJpYXQiOjE3Nzc5MDI3MjYsImV4cCI6MTc4NTY3ODcyNn0.Q9JAfNOtBrcktn41QNb_Ve4mhf4eaYsdtCZRR6nBGVg";
const BAKONG_ID = "engreaksmey_kimreach@bkrt";

const getBakongToken = async () => {
  try {
    const snap = await getDoc(doc(db, 'admin', 'config'));
    if (snap.exists()) {
      const data = snap.data();
      if (data.bakongToken) {
        return data.bakongToken;
      }
    }
  } catch (e) {
    console.log("Error fetching Bakong Token from Firestore:", e);
  }
  return BAKONG_TOKEN_FALLBACK;
};

export interface KHQRResponse {
  qrString: string;
  md5: string;
}

export const generatePaymentQR = (amount: number, currency: 'USD' | 'KHR' = 'USD'): KHQRResponse => {
  // Using ts-khqr for more reliable dynamic QR generation (Tag 54)
  const khqrData = {
    tag: TAG.INDIVIDUAL,
    accountID: BAKONG_ID,
    merchantName: "Client Tracking App",
    merchantCity: "Phnom Penh",
    currency: currency === 'USD' ? CURRENCY.USD : CURRENCY.KHR,
    amount: amount,
    countryCode: COUNTRY.KH,
    storeLabel: "Client Tracking App",
    terminalLabel: "Mobile App",
    billNumber: `SUB-${Date.now()}`,
    expirationTimestamp: Date.now() + (5 * 60 * 1000), // Expires in 5 minutes
  };

  const response = KHQR.generate(khqrData);
  console.log("KHQR Generation Response:", response);

  const qrString = response?.data?.qr || '';
  const hash = response?.data?.md5 || md5(qrString || '');

  return {
    qrString,
    md5: hash
  };
};

export const checkPaymentStatus = async (md5Hash: string) => {
  try {
    const token = await getBakongToken();
    const response = await fetch(`https://api-bakong.nbc.gov.kh/v1/check_transaction_by_md5`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ md5: md5Hash })
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Check Payment Error:", error);
    return null;
  }
};
