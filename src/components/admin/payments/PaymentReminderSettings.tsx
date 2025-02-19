'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import MessageTemplateEditor from './MessageTemplateEditor';

interface PaymentReminderSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ReminderSettings {
  sendAllReminders: boolean;
  daysThreshold: number;
  reminderFrequency: 'daily' | 'weekly' | 'custom';
  customDays: number[];
  includeOverdue: boolean;
  messageTemplate: {
    upcoming: string;
    overdue: string;
  };
}

const defaultSettings: ReminderSettings = {
  sendAllReminders: false,
  daysThreshold: 7,
  reminderFrequency: 'weekly',
  customDays: [7, 3, 1],
  includeOverdue: true,
  messageTemplate: {
    upcoming: 'Your payment of ₱{amount} for {type} is due in {days} days.',
    overdue: 'Your payment of ₱{amount} for {type} is overdue by {days} days.'
  }
};

export default function PaymentReminderSettings({ isOpen, onClose }: PaymentReminderSettingsProps) {
  const [settings, setSettings] = useState<ReminderSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settingsDoc = await getDoc(doc(db, 'settings', 'paymentReminders'));
        if (settingsDoc.exists()) {
          setSettings({
            ...defaultSettings,
            ...settingsDoc.data() as ReminderSettings
          });
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'paymentReminders'), settings);
      toast.success('Settings saved successfully');
      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return null;
  }

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-sm rounded-lg bg-white p-6">
          <Dialog.Title className="text-lg font-medium mb-4">
            Payment Reminder Settings
          </Dialog.Title>

          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sendAllReminders"
                  checked={settings.sendAllReminders}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    sendAllReminders: e.target.checked
                  }))}
                  className="rounded border-gray-300"
                />
                <label htmlFor="sendAllReminders">
                  Send reminders for all pending payments
                </label>
              </div>

              {!settings.sendAllReminders && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Days threshold for reminders
                  </label>
                  <input
                    type="number"
                    value={settings.daysThreshold}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      daysThreshold: parseInt(e.target.value) || 7
                    }))}
                    min="1"
                    max="30"
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Send reminders when payment is due within this many days
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reminder Frequency
                </label>
                <select
                  value={settings.reminderFrequency}
                  onChange={(e) => setSettings(prev => ({
                    ...prev,
                    reminderFrequency: e.target.value as 'daily' | 'weekly' | 'custom'
                  }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="custom">Custom Days</option>
                </select>
              </div>

              {settings.reminderFrequency === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Reminder Days
                  </label>
                  <input
                    type="text"
                    value={settings.customDays.join(', ')}
                    onChange={(e) => {
                      const days = e.target.value
                        .split(',')
                        .map(d => parseInt(d.trim()))
                        .filter(d => !isNaN(d));
                      setSettings(prev => ({ ...prev, customDays: days }));
                    }}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="e.g., 7, 3, 1"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Enter days before due date, separated by commas
                  </p>
                </div>
              )}

              <MessageTemplateEditor
                value={settings.messageTemplate}
                onChange={(templates) => setSettings(prev => ({
                  ...prev,
                  messageTemplate: templates
                }))}
              />
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-[#4FB3E8] text-white rounded-md hover:bg-[#4FB3E8]/90 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 