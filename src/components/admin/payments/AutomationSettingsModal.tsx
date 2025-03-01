'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface AutomationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AutomationSettingsModal({ isOpen, onClose }: AutomationSettingsModalProps) {
  const [settings, setSettings] = useState({
    autoReceiptGeneration: true,
    autoPaymentConfirmation: true,
    autoPaymentReconciliation: false,
    autoRefundProcessing: false,
    autoBalanceUpdates: true,
    autoPaymentReminders: true,
    autoOverdueNotifications: true,
    scheduleReports: {
      enabled: false,
      frequency: 'weekly',
      recipients: ''
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'automation'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setSettings({
            ...settings,
            ...data,
            scheduleReports: {
              ...settings.scheduleReports,
              ...(data.scheduleReports || {})
            }
          });
        }
      } catch (error) {
        console.error('Error fetching automation settings:', error);
      }
    };

    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await setDoc(doc(db, 'settings', 'automation'), settings);
      toast.success('Automation settings saved successfully');
      onClose();
    } catch (error) {
      console.error('Error saving automation settings:', error);
      toast.error('Failed to save automation settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <Dialog.Title className="text-lg font-medium mb-4">Payment Automation Settings</Dialog.Title>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoReceiptGeneration"
                    checked={settings.autoReceiptGeneration}
                    onChange={(e) => setSettings({ ...settings, autoReceiptGeneration: e.target.checked })}
                    className="h-4 w-4 text-[#4FB3E8] focus:ring-[#4FB3E8] border-gray-300 rounded"
                  />
                  <label htmlFor="autoReceiptGeneration" className="ml-2 block text-sm text-gray-700">
                    Automatic Receipt Generation
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoPaymentConfirmation"
                    checked={settings.autoPaymentConfirmation}
                    onChange={(e) => setSettings({ ...settings, autoPaymentConfirmation: e.target.checked })}
                    className="h-4 w-4 text-[#4FB3E8] focus:ring-[#4FB3E8] border-gray-300 rounded"
                  />
                  <label htmlFor="autoPaymentConfirmation" className="ml-2 block text-sm text-gray-700">
                    Automatic Payment Confirmation
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoBalanceUpdates"
                    checked={settings.autoBalanceUpdates}
                    onChange={(e) => setSettings({ ...settings, autoBalanceUpdates: e.target.checked })}
                    className="h-4 w-4 text-[#4FB3E8] focus:ring-[#4FB3E8] border-gray-300 rounded"
                  />
                  <label htmlFor="autoBalanceUpdates" className="ml-2 block text-sm text-gray-700">
                    Automatic Balance Updates
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoPaymentReminders"
                    checked={settings.autoPaymentReminders}
                    onChange={(e) => setSettings({ ...settings, autoPaymentReminders: e.target.checked })}
                    className="h-4 w-4 text-[#4FB3E8] focus:ring-[#4FB3E8] border-gray-300 rounded"
                  />
                  <label htmlFor="autoPaymentReminders" className="ml-2 block text-sm text-gray-700">
                    Automatic Payment Reminders
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoOverdueNotifications"
                    checked={settings.autoOverdueNotifications}
                    onChange={(e) => setSettings({ ...settings, autoOverdueNotifications: e.target.checked })}
                    className="h-4 w-4 text-[#4FB3E8] focus:ring-[#4FB3E8] border-gray-300 rounded"
                  />
                  <label htmlFor="autoOverdueNotifications" className="ml-2 block text-sm text-gray-700">
                    Automatic Overdue Notifications
                  </label>
                </div>
              </div>
              
              <div className="pt-2">
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="scheduleReportsEnabled"
                    checked={settings.scheduleReports.enabled}
                    onChange={(e) => setSettings({
                      ...settings,
                      scheduleReports: {
                        ...settings.scheduleReports,
                        enabled: e.target.checked
                      }
                    })}
                    className="h-4 w-4 text-[#4FB3E8] focus:ring-[#4FB3E8] border-gray-300 rounded"
                  />
                  <label htmlFor="scheduleReportsEnabled" className="ml-2 block text-sm font-medium text-gray-700">
                    Schedule Payment Reports
                  </label>
                </div>
                
                {settings.scheduleReports.enabled && (
                  <div className="ml-6 space-y-3">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Frequency
                      </label>
                      <select
                        value={settings.scheduleReports.frequency}
                        onChange={(e) => setSettings({
                          ...settings,
                          scheduleReports: {
                            ...settings.scheduleReports,
                            frequency: e.target.value
                          }
                        })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8]"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">
                        Recipients (Email addresses, comma separated)
                      </label>
                      <input
                        type="text"
                        value={settings.scheduleReports.recipients}
                        onChange={(e) => setSettings({
                          ...settings,
                          scheduleReports: {
                            ...settings.scheduleReports,
                            recipients: e.target.value
                          }
                        })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8]"
                        placeholder="email1@example.com, email2@example.com"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-[#4FB3E8] text-white rounded-md hover:bg-[#4FB3E8]/90 flex items-center"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : 'Save Settings'}
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition>
  );
} 