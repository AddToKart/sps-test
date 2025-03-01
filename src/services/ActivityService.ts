import { db } from '@/lib/firebase/config';
import { collection, addDoc, query, orderBy, limit, onSnapshot, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Activity } from '@/types/activity';

export class ActivityService {
  static async logActivity(data: Omit<Activity, 'id' | 'createdAt'>) {
    try {
      console.log('Attempting to log activity:', data);
      const activityRef = collection(db, 'activities');
      const docRef = await addDoc(activityRef, {
        ...data,
        createdAt: serverTimestamp()
      });
      console.log('Activity logged with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error logging activity:', error);
      throw error; // Re-throw to handle in calling function
    }
  }

  static subscribeToActivities(callback: (activities: Activity[]) => void, maxActivities = 4) {
    console.log('Setting up activity subscription with limit:', maxActivities);
    const activitiesRef = collection(db, 'activities');
    const activitiesQuery = query(
      activitiesRef,
      orderBy('createdAt', 'desc'),
      limit(maxActivities)
    );

    return onSnapshot(activitiesQuery, (snapshot) => {
      console.log('Activity snapshot received, docs count:', snapshot.docs.length);
      const activities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Activity[];
      console.log('Processed activities:', activities);
      callback(activities);
    }, (error) => {
      console.error('Error in activity subscription:', error);
    });
  }

  static async logActivityWithSafeMetadata(activityData: any) {
    try {
      // Ensure metadata is always an object and all fields have default values
      const safeMetadata = {
        ...activityData.metadata || {},
      };
      
      // Explicitly check and provide defaults for common fields that might be undefined
      if (safeMetadata.studentName === undefined) safeMetadata.studentName = '';
      if (safeMetadata.studentId === undefined) safeMetadata.studentId = '';
      if (safeMetadata.amount === undefined) safeMetadata.amount = 0;
      
      // Create the activity with safe metadata
      const activityRef = await addDoc(collection(db, 'activities'), {
        type: activityData.type || 'system',
        action: activityData.action || 'unknown',
        description: activityData.description || '',
        userId: activityData.userId || 'system',
        userType: activityData.userType || 'system',
        metadata: safeMetadata,
        createdAt: Timestamp.now()
      });
      
      return activityRef.id;
    } catch (error) {
      console.error('Error logging activity:', error);
      // Don't throw the error to prevent breaking the main flow
      return null;
    }
  }
} 