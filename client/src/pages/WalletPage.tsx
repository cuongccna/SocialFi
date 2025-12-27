/**
 * WalletPage - Connect TON Wallet
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Gift,
  Shield,
  Coins,
} from 'lucide-react';
import { TonConnectButton, useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { api } from '../api/axiosClient';
import { haptic } from '../utils/telegram';

export default function WalletPage() {
  const navigate = useNavigate();
  const [tonConnectUI] = useTonConnectUI();
  const userFriendlyAddress = useTonAddress();
  
  const [walletStatus, setWalletStatus] = useState<{
    is_connected: boolean;
    wallet_address: string | null;
    connected_at: string | null;
    wallet_rank: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [copied, setCopied] = useState(false);

  interface WalletStatusResponse {
    is_connected: boolean;
    wallet_address: string | null;
    connected_at: string | null;
    wallet_rank: string | null;
  }

  interface ConnectResponse {
    is_first_connection: boolean;
    bonus?: number;
  }

  useEffect(() => {
    loadWalletStatus();
  }, []);

  // Sync wallet when connected via TonConnect
  useEffect(() => {
    if (userFriendlyAddress && (!walletStatus?.wallet_address || walletStatus.wallet_address !== userFriendlyAddress)) {
      syncWallet(userFriendlyAddress);
    }
  }, [userFriendlyAddress]);

  async function loadWalletStatus() {
    try {
      setLoading(true);
      const res = await api.get<WalletStatusResponse>('/wallet/status');
      setWalletStatus(res);
    } catch (err) {
      console.error('Failed to load wallet status:', err);
    } finally {
      setLoading(false);
    }
  }

  async function syncWallet(address: string) {
    try {
      setSyncing(true);
      haptic.impact('medium');
      
      const res = await api.post<ConnectResponse>('/wallet/connect', {
        wallet_address: address,
      });

      if (res.is_first_connection && res.bonus) {
        haptic.notification('success');
        alert(`🎉 Wallet connected! You earned ${res.bonus} $LOVE bonus!`);
      }

      loadWalletStatus();
    } catch (err: any) {
      haptic.notification('error');
      console.error('Failed to sync wallet:', err);
      alert(err.response?.data?.message || 'Failed to connect wallet');
    } finally {
      setSyncing(false);
    }
  }

  async function disconnectWallet() {
    try {
      haptic.impact('light');
      
      // Disconnect from TonConnect
      await tonConnectUI.disconnect();
      
      // Update backend
      await api.delete('/wallet/disconnect');
      
      setWalletStatus(prev => prev ? { ...prev, is_connected: false, wallet_address: null } : null);
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  }

  async function copyAddress() {
    if (!walletStatus?.wallet_address) return;
    
    const address = walletStatus.wallet_address;
    haptic.impact('light');
    
    // Try multiple copy methods
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(address);
        setCopied(true);
        haptic.notification('success');
        setTimeout(() => setCopied(false), 2000);
        return;
      }
    } catch (err) {
      console.log('Clipboard API blocked');
    }

    // Fallback
    try {
      const textArea = document.createElement('textarea');
      textArea.value = address;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        setCopied(true);
        haptic.notification('success');
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-dark-bg p-4">
        <Loader2 className="w-12 h-12 text-neon-green animate-spin mb-4" />
        <p className="text-white/60">Loading...</p>
      </div>
    );
  }

  const isConnected = !!userFriendlyAddress || walletStatus?.is_connected;

  return (
    <div className="min-h-screen bg-dark-bg pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-dark-bg/95 backdrop-blur-sm border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Wallet className="w-6 h-6 text-neon-blue" />
              TON Wallet
            </h1>
            <p className="text-white/60 text-sm">
              {isConnected ? 'Connected' : 'Connect to earn rewards'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {!isConnected ? (
          /* Not Connected State */
          <>
            <div className="bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 rounded-2xl p-6 border border-neon-blue/30 text-center">
              <div className="w-24 h-24 mx-auto bg-neon-blue/20 rounded-full flex items-center justify-center mb-4">
                <Wallet className="w-12 h-12 text-neon-blue" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Connect Your Wallet
              </h2>
              <p className="text-white/60 mb-6">
                Link your TON wallet to unlock exclusive rewards and features!
              </p>

              {/* TON Connect Button */}
              <div className="flex justify-center mb-4">
                <TonConnectButton />
              </div>

              {syncing && (
                <div className="flex items-center justify-center gap-2 text-neon-blue">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Syncing wallet...</span>
                </div>
              )}
            </div>

            {/* Benefits */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Benefits</h3>
              
              <div className="bg-dark-card rounded-xl p-4 flex items-start gap-3">
                <Gift className="w-6 h-6 text-neon-yellow flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium text-white">+25 $LOVE Bonus</p>
                  <p className="text-white/60 text-sm">Get instant reward when you connect</p>
                </div>
              </div>

              <div className="bg-dark-card rounded-xl p-4 flex items-start gap-3">
                <Coins className="w-6 h-6 text-neon-green flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium text-white">Withdraw Earnings</p>
                  <p className="text-white/60 text-sm">Convert $LOVE to real TON tokens</p>
                </div>
              </div>

              <div className="bg-dark-card rounded-xl p-4 flex items-start gap-3">
                <Shield className="w-6 h-6 text-neon-purple flex-shrink-0 mt-1" />
                <div>
                  <p className="font-medium text-white">Verified Status</p>
                  <p className="text-white/60 text-sm">Get a verified badge on your profile</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          /* Connected State */
          <>
            <div className="bg-gradient-to-br from-neon-green/20 to-neon-blue/20 rounded-2xl p-6 border border-neon-green/30">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-neon-green/20 rounded-full flex items-center justify-center">
                  <Check className="w-8 h-8 text-neon-green" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Wallet Connected</h2>
                  <p className="text-white/60 text-sm">
                    {walletStatus?.wallet_rank || 'SHRIMP'} rank
                  </p>
                </div>
              </div>

              {/* Wallet Address */}
              <div className="bg-dark-bg rounded-xl p-4">
                <p className="text-white/60 text-xs mb-2">Wallet Address</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm text-white truncate flex-1">
                    {userFriendlyAddress || walletStatus?.wallet_address}
                  </p>
                  <button onClick={copyAddress} className="p-2 hover:bg-white/10 rounded-lg">
                    {copied ? (
                      <Check className="w-5 h-5 text-neon-green" />
                    ) : (
                      <Copy className="w-5 h-5 text-white/60" />
                    )}
                  </button>
                </div>
              </div>

              {/* Connected Date */}
              {walletStatus?.connected_at && (
                <p className="text-white/40 text-xs text-center mt-4">
                  Connected on {new Date(walletStatus.connected_at).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* TON Connect Button for management */}
            <div className="flex justify-center">
              <TonConnectButton />
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <a
                href={`https://tonviewer.com/${userFriendlyAddress || walletStatus?.wallet_address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-dark-card rounded-xl p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ExternalLink className="w-5 h-5 text-white/60" />
                    <span>View on TON Viewer</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-white/40" />
                </div>
              </a>

              <button
                onClick={disconnectWallet}
                className="w-full bg-dark-card rounded-xl p-4 text-neon-red hover:bg-neon-red/10 transition-colors text-left"
              >
                Disconnect Wallet
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
