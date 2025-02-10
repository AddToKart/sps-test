'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface OverdueSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function OverdueSettingsModal({ isOpen, onClose }: OverdueSettingsModalProps) {
  const [settings, setSettings] = useState({
    gracePeriod: 7,
    penaltyRate: 5,
    maxPenalty: 20,
    enableReminders: true,
    reminderDays: [3, 1],
    autoSuspend: false,
    suspendAfterDays: 30
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'overdue'));
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data() as any);
        }
      } catch (error) {
        console.error('Error fetching overdue settings:', error);
      }
    };

    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, 'settings', 'overdue'), settings);
      onClose();
    } catch (error) {
      console.error('Error saving overdue settings:', error);
    }
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <Dialog.Title className="text-lg font-medium mb-4">Overdue Payment Settings</Dialog.Title>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Grace Period (days)</label>
                <input
                  type="number"
                  value={settings.gracePeriod}
                  onChange={(e) => setSettings({ ...settings, gracePeriod: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8]"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Penalty Rate (%)</label>
                <input
                  type="number"
                  value={settings.penaltyRate}
                  onChange={(e) => setSettings({ ...settings, penaltyRate: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8]"
                  min="0"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Maximum Penalty (%)</label>
                <input
                  type="number"
                  value={settings.maxPenalty}
                  onChange={(e) => setSettings({ ...settings, maxPenalty: parseInt(e.target.value) })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8]"
                  min="0"
                  max="100"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enableReminders"
                  checked={settings.enableReminders}
                  onChange={(e) => setSettings({ ...settings, enableReminders: e.target.checked })}
                  className="h-4 w-4 text-[#4FB3E8] focus:ring-[#4FB3E8] border-gray-300 rounded"
                />
                <label htmlFor="enableReminders" className="ml-2 block text-sm text-gray-700">
                  Enable Payment Reminders
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoSuspend"
                  checked={settings.autoSuspend}
                  onChange={(e) => setSettings({ ...settings, autoSuspend: e.target.checked })}
                  className="h-4 w-4 text-[#4FB3E8] focus:ring-[#4FB3E8] border-gray-300 rounded"
                />
                <label htmlFor="autoSuspend" className="ml-2 block text-sm text-gray-700">
                  Auto-suspend Overdue Accounts
                </label>
              </div>

              {settings.autoSuspend && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Suspend After (days)
                  </label>
                  <input
                    type="number"
                    value={settings.suspendAfterDays}
                    onChange={(e) => setSettings({ ...settings, suspendAfterDays: parseInt(e.target.value) })}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8]"
                    min="1"
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