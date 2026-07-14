import { db } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  deleteDoc
} from 'firebase/firestore';
import { Position, ResumeData, PersonalityResult } from '../types';
import { MOCK_POSITIONS } from '../data';

// 1. Position operations
export async function seedPositionsToFirestore(): Promise<void> {
  try {
    const colRef = collection(db, 'positions');
    const snapshot = await getDocs(colRef);
    
    // Clear old positions
    if (!snapshot.empty) {
      console.log(`Clearing ${snapshot.size} old positions from Firestore...`);
      const deletePromises = snapshot.docs.map((d) => deleteDoc(d.ref));
      await Promise.all(deletePromises);
    }

    // Seed new positions
    console.log(`Seeding ${MOCK_POSITIONS.length} new positions into Firestore...`);
    for (const pos of MOCK_POSITIONS) {
      await setDoc(doc(db, 'positions', pos.id), pos);
    }
    console.log('Seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding positions to Firestore:', error);
    throw error;
  }
}

export async function getPositions(): Promise<Position[]> {
  try {
    const colRef = collection(db, 'positions');
    const snapshot = await getDocs(colRef);
    
    // Check if database contains old schema IDs (e.g., 'net-0001' or 'soe-0027' instead of 'pos-')
    const hasOldSchema = !snapshot.empty && snapshot.docs.some(d => !d.id.startsWith('pos-'));
    
    if (snapshot.empty || snapshot.size !== MOCK_POSITIONS.length || hasOldSchema) {
      console.log(`Firestore has stale or missing positions. Re-seeding new positions in Firestore...`);
      await seedPositionsToFirestore();
      return MOCK_POSITIONS;
    }
    
    const positions: Position[] = [];
    snapshot.forEach((doc) => {
      positions.push(doc.data() as Position);
    });
    // Sort positions by ID to keep consistent display
    positions.sort((a, b) => a.id.localeCompare(b.id));
    return positions;
  } catch (error) {
    console.error('Error fetching positions from Firestore, falling back to mock:', error);
    return MOCK_POSITIONS;
  }
}

// 2. Resume operations
export async function saveResume(userId: string, data: ResumeData): Promise<void> {
  localStorage.setItem(`resume_${userId}`, JSON.stringify(data));
  try {
    if (userId && !userId.startsWith('guest_')) {
      const docRef = doc(db, 'resumes', userId);
      await setDoc(docRef, {
        userId,
        ...data,
        updatedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error saving resume to Firestore, saved to local storage:', error);
  }
}

export async function getLatestResume(userId: string): Promise<ResumeData | null> {
  try {
    if (userId && !userId.startsWith('guest_')) {
      const docRef = doc(db, 'resumes', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const { userId: _, updatedAt: __, ...resume } = data;
        localStorage.setItem(`resume_${userId}`, JSON.stringify(resume));
        return resume as ResumeData;
      }
    }
  } catch (error) {
    console.error('Error fetching resume from Firestore, trying local storage fallback:', error);
  }

  const localData = localStorage.getItem(`resume_${userId}`);
  if (localData) {
    try {
      return JSON.parse(localData) as ResumeData;
    } catch (e) {
      console.error('Error parsing local resume data:', e);
    }
  }
  return null;
}

// 3. Assessment operations
export async function saveAssessment(
  userId: string, 
  personalityResult: PersonalityResult,
  scores: any = {}
): Promise<void> {
  localStorage.setItem(`assessment_${userId}`, JSON.stringify({ personalityResult, scores }));
  try {
    if (userId && !userId.startsWith('guest_')) {
      const docRef = doc(db, 'assessments', userId);
      await setDoc(docRef, {
        userId,
        scores,
        personalityResult,
        completedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Error saving assessment to Firestore, saved to local storage:', error);
  }
}

export async function getLatestAssessment(userId: string): Promise<PersonalityResult | null> {
  try {
    if (userId && !userId.startsWith('guest_')) {
      const docRef = doc(db, 'assessments', userId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const result = data.personalityResult as PersonalityResult;
        localStorage.setItem(`assessment_${userId}`, JSON.stringify({ personalityResult: result, scores: data.scores || {} }));
        return result;
      }
    }
  } catch (error) {
    console.error('Error fetching assessment from Firestore, trying local storage fallback:', error);
  }

  const localData = localStorage.getItem(`assessment_${userId}`);
  if (localData) {
    try {
      const parsed = JSON.parse(localData);
      return parsed.personalityResult as PersonalityResult;
    } catch (e) {
      console.error('Error parsing local assessment:', e);
    }
  }
  return null;
}

// 4. Favorites operations
export async function toggleFavorite(userId: string, positionId: string): Promise<boolean> {
  const localFavsKey = `favorites_${userId}`;
  let localFavs: string[] = [];
  try {
    const data = localStorage.getItem(localFavsKey);
    if (data) localFavs = JSON.parse(data);
  } catch (e) {
    console.error('Error parsing local favorites:', e);
  }

  const isFav = localFavs.includes(positionId);
  let updatedFavs: string[];
  if (isFav) {
    updatedFavs = localFavs.filter(id => id !== positionId);
  } else {
    updatedFavs = [...localFavs, positionId];
  }
  localStorage.setItem(localFavsKey, JSON.stringify(updatedFavs));

  try {
    if (userId && !userId.startsWith('guest_')) {
      const favId = `${userId}_${positionId}`;
      const docRef = doc(db, 'favorites', favId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        await deleteDoc(docRef);
        return false;
      } else {
        await setDoc(docRef, {
          userId,
          positionId,
          createdAt: new Date().toISOString()
        });
        return true;
      }
    }
  } catch (error) {
    console.error('Error toggling favorite in Firestore, saved locally:', error);
  }

  return !isFav;
}

export async function getFavorites(userId: string): Promise<string[]> {
  try {
    if (userId && !userId.startsWith('guest_')) {
      const q = query(collection(db, 'favorites'), where('userId', '==', userId));
      const snapshot = await getDocs(q);
      const positionIds: string[] = [];
      snapshot.forEach((doc) => {
        positionIds.push(doc.data().positionId);
      });
      localStorage.setItem(`favorites_${userId}`, JSON.stringify(positionIds));
      return positionIds;
    }
  } catch (error) {
    console.error('Error fetching favorites from Firestore, trying local storage:', error);
  }

  try {
    const data = localStorage.getItem(`favorites_${userId}`);
    if (data) {
      return JSON.parse(data) as string[];
    }
  } catch (e) {
    console.error('Error loading local favorites:', e);
  }
  return [];
}
