import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import QRCode from 'react-native-qrcode-svg';

interface KHQRCardProps {
  qrString: string;
  merchantName: string;
  amount: string | number;
  currency: string;
}

// Cleaned up template: Removed static QR dots and sample text paths to prevent them peeking through
const KHQR_SVG_TEMPLATE = `
<svg width="442" height="622" viewBox="0 0 442 622" fill="none" xmlns="http://www.w3.org/2000/svg">
<g filter="url(#filter0_d_322_2)">
<path d="M421 21H21V601H421V21Z" fill="white"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M21 21H421V90V90.6V123.5L388.1 90.6H21V21Z" fill="#E21A1A"/>
<path d="M233.525 53.8332V60.4999H226.972C226.316 60.4999 225.825 59.9999 225.825 59.3332V53.8332C225.825 53.1665 226.316 52.6665 226.972 52.6665H232.215C233.034 52.4999 233.525 53.1665 233.525 53.8332Z" fill="white"/>
<path d="M264 56.5H260.723C260.723 52.5 257.61 49.3333 253.678 49.3333C250.565 49.3333 247.944 51.3333 246.96 54.3333C246.797 55 246.633 55.8333 246.633 56.5V67H246.469C244.667 67 243.356 65.5 243.356 63.8333V56.5C243.356 53.6667 244.503 50.8333 246.633 48.8333C248.599 47 251.057 46 253.678 46C259.412 46 264 50.6667 264 56.5Z" fill="white"/>
<path d="M264 66.9999H259.412L258.265 65.8333L255.808 63.3333L252.367 59.8333H256.955L264 66.9999Z" fill="white"/>
<path d="M234.672 63.6667H224.842C223.695 63.6667 222.712 62.6667 222.712 61.5V51.5C222.712 50.3333 223.695 49.3333 224.842 49.3333H234.672C235.819 49.3333 236.802 50.3333 236.802 51.5V61.5L240.079 64.8333V49.1667C240.079 47.3333 238.604 46 236.966 46H222.712C220.909 46 219.599 47.5 219.599 49.1667V63.6667C219.599 65.5 221.073 66.8333 222.712 66.8333H237.949L234.672 63.6667Z" fill="white"/>
<path d="M194.859 67H190.271L180.768 57.1667V67H177V46H180.768V55.3333L189.944 46H194.367L184.537 56L194.859 67Z" fill="white"/>
<path d="M212.062 46H215.667V67H212.062V57.8333H201.576V67H197.808V46H201.576V54.8333H212.062V46Z" fill="white"/>
<path d="M21 218.5H421" stroke="black" stroke-opacity="0.5" stroke-dasharray="8 8"/>
</g>
<defs>
<filter id="filter0_d_322_2" x="0" y="0" width="442" height="622" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
<feOffset/>
<feGaussianBlur stdDeviation="10.5"/>
<feComposite in2="hardAlpha" operator="out"/>
<feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.16 0"/>
<feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_322_2"/>
<feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_322_2" result="shape"/>
</filter>
</defs>
</svg>
`;

const KHQRCard: React.FC<KHQRCardProps> = ({ qrString, merchantName, amount, currency }) => {
  // Format amount to remove trailing .00
  const displayAmount = typeof amount === 'number' ? 
    (amount % 1 === 0 ? amount.toString() : amount.toFixed(2)) : 
    amount;

  return (
    <View style={styles.container}>
      <SvgXml xml={KHQR_SVG_TEMPLATE} width="300" height="422" />

      {/* Left-Aligned Information Overlay */}
      <View style={styles.leftInfoOverlay}>
        <Text style={styles.merchantText}>{merchantName}</Text>
        <View style={styles.amountRow}>
          <Text style={styles.amountText}>{displayAmount}</Text>
          <Text style={styles.currencyText}>{currency}</Text>
        </View>
      </View>

      {/* Dynamic QR Code Overlay */}
      <View style={styles.qrOverlay}>
        <QRCode
          value={qrString}
          size={210}
          color="#000"
          backgroundColor="transparent"
          onError={(e: any) => console.log('QRCode Error:', e)}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 300,
    height: 422,
    position: 'relative',
    alignItems: 'center',
  },
  leftInfoOverlay: {
    position: 'absolute',
    top: 85, 
    left: 42,
    width: '100%',
    alignItems: 'flex-start',
  },
  merchantText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  amountText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#E21A1A',
  },
  currencyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#E21A1A',
  },
  qrOverlay: {
    position: 'absolute',
    top: 172, 
    zIndex: 10,
    // Removed white background and padding as requested
  },
});

export default KHQRCard;
