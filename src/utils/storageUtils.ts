// Storage utility functions to handle incognito mode and storage restrictions
export const isStorageAvailable = (type: 'localStorage' | 'sessionStorage'): boolean => {
  try {
    const storage = window[type];
    const testKey = '__storage_test__';
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
};

export const safeSetItem = (storage: Storage, key: string, value: string): boolean => {
  try {
    storage.setItem(key, value);
    return true;
  } catch (e) {
    console.warn(`Failed to set ${key} in ${storage === localStorage ? 'localStorage' : 'sessionStorage'}:`, e);
    return false;
  }
};

export const safeGetItem = (storage: Storage, key: string): string | null => {
  try {
    return storage.getItem(key);
  } catch (e) {
    console.warn(`Failed to get ${key} from ${storage === localStorage ? 'localStorage' : 'sessionStorage'}:`, e);
    return null;
  }
};

export const safeRemoveItem = (storage: Storage, key: string): boolean => {
  try {
    storage.removeItem(key);
    return true;
  } catch (e) {
    console.warn(`Failed to remove ${key} from ${storage === localStorage ? 'localStorage' : 'sessionStorage'}:`, e);
    return false;
  }
};

// Check if we're in incognito mode
export const isIncognitoMode = (): boolean => {
  try {
    // Test if localStorage is available and working
    if (!isStorageAvailable('localStorage')) {
      return true;
    }
    
    // Additional incognito detection
    const testKey = '__incognito_test__';
    localStorage.setItem(testKey, 'test');
    const retrieved = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    
    return retrieved !== 'test';
  } catch (e) {
    return true;
  }
};
