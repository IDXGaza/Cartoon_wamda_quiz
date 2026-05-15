import { doc, getDoc, setDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';

const USERS_COLLECTION = 'users';

export interface UserCategory {
    name: string;
    topic: string;
}

export const getUserCustomCategories = async (): Promise<UserCategory[]> => {
    if (!auth.currentUser) return [];
    try {
        const ref = doc(db, USERS_COLLECTION, auth.currentUser.uid);
        const docSnap = await getDoc(ref);
        if (docSnap.exists()) {
            return docSnap.data().customCategories || [];
        }
        return [];
    } catch (err) {
        handleFirestoreError(err, OperationType.GET, USERS_COLLECTION);
        return [];
    }
};

export const addUserCustomCategory = async (categoryName: string, topicName: string) => {
    if (!auth.currentUser) return;
    try {
        const ref = doc(db, USERS_COLLECTION, auth.currentUser.uid);
        const docSnap = await getDoc(ref);
        
        if (docSnap.exists()) {
             await setDoc(ref, {
                 customCategories: arrayUnion({ name: categoryName, topic: topicName })
            }, { merge: true });
        } else {
             // If user doc doesn't exist, we can't add custom category to it because of security rules
             console.warn("User document not found, skipping custom category addition");
        }
    } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, USERS_COLLECTION);
    }
};
