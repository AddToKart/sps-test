'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AutomationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AutomationSettingsModal({ isOpen, onClose }: AutomationSettingsModalProps) {
  const [settings, setSettings] = useState({
    enableEmailReminders: true,
    reminderFrequency: 'weekly',
    reminderDaysBefore: 7,
    enableAutoReceipts: true,
    enableLateFees: true,
    enablePaymentScheduling: false,
    paymentScheduleDay: 1
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'automation'));
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data() as any);
        }
      } catch (error) {
        console.error('Error fetching automation settings:', error);
      }
    };

    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'automation'), settings);
      onClose();
    } catch (error) {
      console.error('Error saving automation settings:', error);
    }
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <Dialog.Title className="text-lg font-medium mb-4">Payment Automation Settings</Dialog.Title>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enableEmailReminders"
                  checked={settings.enableEmailReminders}
                  onChange={(e) => setSettings({ ...settings, enableEmailReminders: e.target.checked })}
                  className="h-4 w-4 text-[#4FB3E8] focus:ring-[#4FB3E8] border-gray-300 rounded"
                />
                <label htmlFor="enableEmailReminders" className="ml-2 block text-sm text-gray-700">
                  Enable Email Reminders
                </label>
              </div>

              {settings.enableEmailReminders && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reminder Frequency</label>
                    <select
                      value={settings.reminderFrequency}
                      onChange={(e) => setSettings({ ...settings, reminderFrequency: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8]"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Send Reminder Days Before Due
                    </label>
                    <input
                      type="number"
                      value={settings.reminderDaysBefore}
                      onChange={(e) => setSettings({ ...settings, reminderDaysBefore: parseInt(e.target.value) })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8]"
                      min="1"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enableAutoReceipts"
                  checked={settings.enableAutoReceipts}
                  onChange={(e) => setSettings({ ...settings, enableAutoReceipts: e.target.checked })}
                  className="h-4 w-4 text-[#4FB3E8] focus:ring-[#4FB3E8] border-gray-300 rounded"
                />
                <label htmlFor="enableAutoReceipts" className="ml-2 block text-sm text-gray-700">
                  Automatically Send Receipts
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enableLateFees"
                  checked={settings.enableLateFees}
                  onChange={(e) => setSettings({ ...settings, enableLateFees: e.target.checked })}
                  className="h-4 w-4 text-[#4FB3E8] focus:ring-[#4FB3E8] border-gray-300 rounded"
                />
                <label htmlFor="enableLateFees" className="ml-2 block text-sm text-gray-700">
                  Enable Automatic Late Fees
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enablePaymentScheduling"
                  checked={settings.enablePaymentScheduling}
                  onChange={(e) => setSettings({ ...settings, enablePaymentScheduling: e.target.checked })}
                  className="h-4 w-4 text-[#4FB3E8] focus:ring-[#4FB3E8] border-gray-300 rounded"
                />
                <label htmlFor="enablePaymentScheduling" className="ml-2 block text-sm text-gray-700">
                  Enable Payment Scheduling
                </label>
              </div>

              {settings.enablePaymentScheduling && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Default Payment Day of Month
                  </label>
                  <input
                    type="number"
                    value={settings.paymentScheduleDay}
                    onChange={(e) => setSettings({ ...settings, paymentScheduleDay: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8]"
                    min="1"
                    max="31"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#4FB3E8] text-white rounded-md hover:bg-[#4FB3E8]/90"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition>
  );
} 