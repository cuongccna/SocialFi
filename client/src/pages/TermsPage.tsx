import React from 'react';

const TermsPage: React.FC = () => {
  return (
    <div className="p-4 text-white">
      <h1 className="text-2xl font-bold mb-4">Terms of Use</h1>
      <p className="mb-2">Last updated: January 2026</p>
      <div className="space-y-4 text-gray-300">
        <p>
          Welcome to CryptoCrush. By accessing or using our platform, you agree to be bound by these Terms of Use.
        </p>
        <h2 className="text-xl font-semibold text-white">1. Acceptance of Terms</h2>
        <p>
          By accessing or using the CryptoCrush application, you agree to comply with and be bound by these terms.
        </p>
        <h2 className="text-xl font-semibold text-white">2. User Conduct</h2>
        <p>
          You agree to use the platform only for lawful purposes and in a way that does not infringe the rights of others.
        </p>
        <h2 className="text-xl font-semibold text-white">3. Crypto Assets</h2>
        <p>
          CryptoCrush involves the use of crypto assets. You acknowledge the risks associated with cryptocurrency trading and usage.
        </p>
        <h2 className="text-xl font-semibold text-white">4. Disclaimer</h2>
        <p>
          The platform is provided "as is" without warranties of any kind.
        </p>
      </div>
    </div>
  );
};

export default TermsPage;
