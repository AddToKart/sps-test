'use client';

import { useState } from 'react';

interface MessageTemplateEditorProps {
  value: {
    upcoming: string;
    overdue: string;
  };
  onChange: (templates: { upcoming: string; overdue: string }) => void;
}

const defaultTemplates = {
  upcoming: 'Your payment of ₱{amount} for {type} is due in {days} days.',
  overdue: 'Your payment of ₱{amount} for {type} is overdue by {days} days.'
};

export default function MessageTemplateEditor({ 
  value = defaultTemplates,  // Provide default value
  onChange 
}: MessageTemplateEditorProps) {
  // Ensure value has both properties
  const templates = {
    upcoming: value?.upcoming || defaultTemplates.upcoming,
    overdue: value?.overdue || defaultTemplates.overdue
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Upcoming Payment Message
        </label>
        <textarea
          defaultValue={templates.upcoming}
          onChange={(e) => onChange({ 
            ...templates, 
            upcoming: e.target.value 
          })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 h-24"
          placeholder="Your payment of ₱{amount} for {type} is due in {days} days."
        />
        <p className="text-sm text-gray-500 mt-1">
          Available variables: {'{amount}'}, {'{type}'}, {'{days}'}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Overdue Payment Message
        </label>
        <textarea
          defaultValue={templates.overdue}
          onChange={(e) => onChange({ 
            ...templates, 
            overdue: e.target.value 
          })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 h-24"
          placeholder="Your payment of ₱{amount} for {type} is overdue by {days} days."
        />
        <p className="text-sm text-gray-500 mt-1">
          Available variables: {'{amount}'}, {'{type}'}, {'{days}'}
        </p>
      </div>
    </div>
  );
} 