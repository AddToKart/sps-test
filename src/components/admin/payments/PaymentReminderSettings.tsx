'use client';

import { Fragment, useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

interface PaymentReminderSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PaymentReminderSettings({ isOpen, onClose }: PaymentReminderSettingsProps) {
  const [settings, setSettings] = useState({
    sendAllReminders: false,
    daysThreshold: 7,
    reminderFrequency: 'weekly',
    customDays: [7, 3, 1],
    includeOverdue: true,
    messageTemplate: {
      upcoming: 'Your payment of ₱{amount} for {type} is due in {days} days.',
      overdue: 'Your payment of ₱{amount} for {type} is overdue by {days} days.'
    }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'reminders'));
        if (settingsDoc.exists()) {
          setSettings(settingsDoc.data() as any);
        }
      } catch (error) {
        console.error('Error fetching reminder settings:', error);
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
      await setDoc(doc(db, 'settings', 'reminders'), settings);
      toast.success('Reminder settings saved successfully');
      onClose();
    } catch (error) {
      console.error('Error saving reminder settings:', error);
      toast.error('Failed to save reminder settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition show={isOpen} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/30" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <Dialog.Title className="text-lg font-medium mb-4">Payment Reminder Settings</Dialog.Title>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="sendAllReminders"
                  checked={settings.sendAllReminders}
                  onChange={(e) => setSettings({ ...settings, sendAllReminders: e.target.checked })}
                  className="h-4 w-4 text-[#4FB3E8] focus:ring-[#4FB3E8] border-gray-300 rounded"
                />
                <label htmlFor="sendAllReminders" className="ml-2 block text-sm text-gray-700">
                  Send Reminders for All Upcoming Payments
                </label>
              </div>

              {!settings.sendAllReminders && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Days Before Due Date
                  </label>
                  <input
                    type="number"
                    value={settings.daysThreshold}
                    onChange={(e) => setSettings({ ...settings, daysThreshold: parseInt(e.target.value) })}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8]"
                    min="1"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reminder Frequency
                </label>
                <select
                  value={settings.reminderFrequency}
                  onChange={(e) => setSettings({ ...settings, reminderFrequency: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8]"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="custom">Custom Days</option>
                </select>
              </div>

              {settings.reminderFrequency === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Custom Reminder Days (comma separated)
                  </label>
                  <input
                    type="text"
                    value={settings.customDays.join(', ')}
                    onChange={(e) => {
                      const daysArray = e.target.value.split(',').map(day => parseInt(day.trim())).filter(day => !isNaN(day));
                      setSettings({ ...settings, customDays: daysArray });
                    }}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8]"
                    placeholder="7, 3, 1"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Days before due date to send reminders
                  </p>
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="includeOverdue"
                  checked={settings.includeOverdue}
                  onChange={(e) => setSettings({ ...settings, includeOverdue: e.target.checked })}
                  className="h-4 w-4 text-[#4FB3E8] focus:ring-[#4FB3E8] border-gray-300 rounded"
                />
                <label htmlFor="includeOverdue" className="ml-2 block text-sm text-gray-700">
                  Include Overdue Payment Reminders
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Upcoming Payment Message Template
                </label>
                <textarea
                  value={settings.messageTemplate.upcoming}
                  onChange={(e) => setSettings({
                    ...settings,
                    messageTemplate: {
                      ...settings.messageTemplate,
                      upcoming: e.target.value
                    }
                  })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8]"
                  rows={2}
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Overdue Payment Message Template
                </label>
                <textarea
                  value={settings.messageTemplate.overdue}
                  onChange={(e) => setSettings({
                    ...settings,
                    messageTemplate: {
                      ...settings.messageTemplate,
                      overdue: e.target.value
                    }
                  })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-[#4FB3E8] focus:ring-[#4FB3E8]"
                  rows={2}
                ></textarea>
                <p className="mt-1 text-xs text-gray-500">
                  You can use {'{amount}'}, {'{type}'}, and {'{days}'} as placeholders.
                </p>
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