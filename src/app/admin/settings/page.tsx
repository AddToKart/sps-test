export default function AdminSettings() {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">System Settings</h2>
      <div className="space-y-6">
        <section className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Email Notifications</h3>
          {/* Add email settings */}
        </section>
        <section className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Payment Settings</h3>
          {/* Add payment settings */}
        </section>
        <section className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">System Maintenance</h3>
          {/* Add maintenance options */}
        </section>
      </div>
    </div>
  );
} 