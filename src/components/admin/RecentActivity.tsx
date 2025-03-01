'use client';

import { useEffect, useState } from 'react';
import { Activity } from '@/types/activity';
import { ActivityService } from '@/services/ActivityService';
import { formatDistanceToNow } from 'date-fns';

export default function RecentActivity() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Set the maximum number of activities to display
  const MAX_ACTIVITIES = 4;

  useEffect(() => {
    const unsubscribe = ActivityService.subscribeToActivities((newActivities) => {
      // Limit the activities to the most recent MAX_ACTIVITIES
      setActivities(newActivities.slice(0, MAX_ACTIVITIES));
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'payment':
        return '💰';
      case 'student':
        return '👤';
      case 'system':
        return '⚙️';
      case 'balance':
        return '💵';
      case 'notification':
        return '🔔';
      default:
        return '📝';
    }
  };

  const formatActivity = (activity: Activity) => {
    switch (activity.type) {
      case 'payment':
        return `New payment of ₱${activity.metadata?.amount} received from ${activity.metadata?.studentName}`;
      case 'student':
        return activity.description;
      default:
        return activity.description;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
      <div className="space-y-4">
        {activities.length > 0 ? (
          activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-4">
              <div className="bg-blue-100 rounded-full p-2 mt-1">
                {getActivityIcon(activity.type)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{formatActivity(activity)}</p>
                <p className="text-xs text-gray-500">
                  {activity.createdAt && formatDistanceToNow(activity.createdAt.toDate(), { addSuffix: true })}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500">No recent activity</p>
        )}
      </div>
    </div>
  );
} 