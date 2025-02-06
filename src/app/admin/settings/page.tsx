'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface SystemSettings {
  emailNotifications: {
    enabled: boolean;
    paymentReminders: boolean;
    dueDateAlerts: boolean;
    receiptCopy: boolean;
  };
  paymentSettings: {
    allowPartialPayments: boolean;
    gracePeriod: number; // days
    lateFee: number;
    acceptedPaymentMethods: string[];
  };
  maintenance: {
    maintenanceMode: boolean;
    backupFrequency: string;
    dataRetentionDays: number;
  };
}

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [settings, setSettings] = useState<SystemSettings>({
    emailNotifications: {
      enabled: false,
      paymentReminders: false,
      dueDateAlerts: false,
      receiptCopy: false,
    },
    paymentSettings: {
      allowPartialPayments: false,
      gracePeriod: 7,
      lateFee: 0,
      acceptedPaymentMethods: [],
    },
    maintenance: {
      maintenanceMode: false,
      backupFrequency: 'daily',
      dataRetentionDays: 365,
    },
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'system', 'settings'));
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data() as SystemSettings);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        setError('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await setDoc(doc(db, 'system', 'settings'), settings);
      setSuccess('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">System Settings</h2>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-400 text-green-700 rounded">
          {success}
        </div>
      )}

      <div className="space-y-6">
        {/* Email Notifications */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Email Notifications</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-gray-700">Enable Email Notifications</label>
              <input
                type="checkbox"
                checked={settings.emailNotifications.enabled}
                onChange={(e) => setSettings({
                  ...settings,
                  emailNotifications: {
                    ...settings.emailNotifications,
                    enabled: e.target.checked
                  }
                })}
                className="h-4 w-4 text-[#4FB3E8] focus:ring-[#4FB3E8] border-gray-300 rounded"
              />
            </div>
            {settings.emailNotifications.enabled && (
              <>
                <div className="flex items-center justify-between">
                  <label className="text-gray-700">Payment Reminders</label>
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications.paymentReminders}
                    onChange={(e) => setSettings({
                      ...settings,
                      emailNotifications: {
                        ...settings.emailNotifications,
                        paymentReminders: e.target.checked
                      }
                    })}
                    className="h-4 w-4 text-[#4FB3E8] focus:ring-[#4FB3E8] border-gray-300 rounded"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-gray-700">Due Date Alerts</label>
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications.dueDateAlerts}
                    onChange={(e) => setSettings({
                      ...settings,
                      emailNotifications: {
                        ...settings.emailNotifications,
                        dueDateAlerts: e.target.checked
                      }
                    })}
                    className="h-4 w-4 text-[#4FB3E8] focus:ring-[#4FB3E8] border-gray-300 rounded"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-gray-700">Send Receipt Copy</label>
                  <input
                    type="checkbox"
                    checked={settings.emailNotifications.receiptCopy}
                    onChange={(e) => setSettings({
                      ...settings,
                      emailNotifications: {
                        ...settings.emailNotifications,
                        receiptCopy: e.target.checked
                      }
                    })}
                    className="h-4 w-4 text-[#4FB3E8] focus:ring-[#4FB3E8] border-gray-300 rounded"
                  />
                </div>
              </>
            )}
          </div>
        </section>

        {/* Payment Settings */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Payment Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-gray-700">Allow Partial Payments</label>
              <input
                type="checkbox"
                checked={settings.paymentSettings.allowPartialPayments}
                onChange={(e) => setSettings({
                  ...settings,
                  paymentSettings: {
                    ...settings.paymentSettings,
                    allowPartialPayments: e.target.checked
                  }
                })}
                className="h-4 w-4 text-[#4FB3E8] focus:ring-[#4FB3E8] border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Grace Period (Days)</label>
              <input
                type="number"
                min="0"
                value={settings.paymentSettings.gracePeriod}
                onChange={(e) => setSettings({
                  ...settings,
                  paymentSettings: {
                    ...settings.paymentSettings,
                    gracePeriod: parseInt(e.target.value) || 0
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#4FB3E8] focus:border-[#4FB3E8]"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Late Fee Amount</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={settings.paymentSettings.lateFee}
                onChange={(e) => setSettings({
                  ...settings,
                  paymentSettings: {
                    ...settings.paymentSettings,
                    lateFee: parseFloat(e.target.value) || 0
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#4FB3E8] focus:border-[#4FB3E8]"
              />
            </div>
          </div>
        </section>

        {/* System Maintenance */}
        <section className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">System Maintenance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-gray-700">Maintenance Mode</label>
              <input
                type="checkbox"
                checked={settings.maintenance.maintenanceMode}
                onChange={(e) => setSettings({
                  ...settings,
                  maintenance: {
                    ...settings.maintenance,
                    maintenanceMode: e.target.checked
                  }
                })}
                className="h-4 w-4 text-[#4FB3E8] focus:ring-[#4FB3E8] border-gray-300 rounded"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-2">Backup Frequency</label>
              <select
                value={settings.maintenance.backupFrequency}
                onChange={(e) => setSettings({
                  ...settings,
                  maintenance: {
                    ...settings.maintenance,
                    backupFrequency: e.target.value
                  }
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-[#4FB3E8] focus:border-[#4FB3E8]"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-[#4FB3E8] text-white rounded-md hover:bg-[#4FB3E8]/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
} 