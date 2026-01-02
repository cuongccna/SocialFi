import React from 'react';

const PrivacyPage: React.FC = () => {
  return (
    <div className="p-4 text-white">
      <h1 className="text-2xl font-bold mb-4">Privacy Policy</h1>
      <p className="mb-2">Last updated: January 2026</p>
      <div className="space-y-4 text-gray-300">
        <p>
          At CryptoCrush, we take your privacy seriously. This Privacy Policy explains how we collect, use, and protect your personal information.
        </p>
        <h2 className="text-xl font-semibold text-white">1. Information We Collect</h2>
        <p>
          We collect information you provide directly to us, such as your Telegram profile information and wallet address.
        </p>
        <h2 className="text-xl font-semibold text-white">2. How We Use Your Information</h2>
        <p>
          We use your information to provide, maintain, and improve our services, and to facilitate matches and transactions.
        </p>
        <h2 className="text-xl font-semibold text-white">3. Data Security</h2>
        <p>
          We implement appropriate security measures to protect your personal information.
        </p>
        <h2 className="text-xl font-semibold text-white">4. Contact Us</h2>
        <p>
          If you have any questions about this Privacy Policy, please contact us through our support channels.
        </p>
      </div>
    </div>
  );
};

export default PrivacyPage;
