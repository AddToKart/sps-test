'use client';

import { useState } from 'react';
import { migrateBalances } from '@/utils/migrateBalances';

export default function MigrateDataButton() {
  const [isMigrating, setIsMigrating] = useState(false);

  const handleMigrate = async () => {
    if (window.confirm('Are you sure you want to migrate the data? This should only be done once.')) {
      setIsMigrating(true);
      try {
        await migrateBalances();
        alert('Migration completed successfully!');
      } catch (error) {
        console.error('Migration failed:', error);
        alert('Migration failed. Please check the console for details.');
      } finally {
        setIsMigrating(false);
      }
    }
  };

  return (
    <button
      onClick={handleMigrate}
      disabled={isMigrating}
      className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50"
    >
      {isMigrating ? 'Migrating...' : 'Migrate Data'}
    </button>
  );
} 