// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc, collection } from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Cache repository data with sanitized path
export const cacheRepositoryData = async (owner, repo, data) => {
  try {
    const sanitizedPath = `${owner}_${repo}`.replace(/[\/.]/g, '_');
    const repoRef = doc(db, 'repositories', sanitizedPath);
    await setDoc(repoRef, {
      owner,
      repo,
      data,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error caching repository data:', error);
    return false;
  }
};

// Get cached repository data with sanitized path
export const getCachedRepositoryData = async (owner, repo) => {
  try {
    const sanitizedPath = `${owner}_${repo}`.replace(/[\/.]/g, '_');
    const repoRef = doc(db, 'repositories', sanitizedPath);
    const docSnap = await getDoc(repoRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.lastUpdated) {
        const lastUpdated = new Date(data.lastUpdated);
        const now = new Date();
        const hoursSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60);
        if (hoursSinceUpdate > 24) {
          return null; // Cache expired after 24 hours
        }
      }
      return data;
    }
    return null;
  } catch (error) {
    console.error('Error getting cached repository data:', error);
    return null;
  }
};

// Cache file content and analysis with sanitized path
export const cacheFileData = async (owner, repo, path, content, analysis) => {
  try {
    const sanitizedPath = `${owner}_${repo}_${path}`.replace(/[\/.]/g, '_');
    const fileRef = doc(db, 'files', sanitizedPath);
    await setDoc(fileRef, {
      owner,
      repo,
      path,
      content,
      analysis,
      lastUpdated: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error caching file data:', error);
    return false;
  }
};

// Get cached file data with sanitized path
export const getCachedFileData = async (owner, repo, path) => {
  try {
    const sanitizedPath = `${owner}_${repo}_${path}`.replace(/[\/.]/g, '_');
    const fileRef = doc(db, 'files', sanitizedPath);
    const docSnap = await getDoc(fileRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.lastUpdated) {
        const lastUpdated = new Date(data.lastUpdated);
        const now = new Date();
        const hoursSinceUpdate = (now - lastUpdated) / (1000 * 60 * 60);
        if (hoursSinceUpdate > 24) {
          return null; // Cache expired after 24 hours
        }
      }
      return data;
    }
    return null;
  } catch (error) {
    console.error('Error getting cached file data:', error);
    return null;
  }
};