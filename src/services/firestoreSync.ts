import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs,
  getDocFromServer
} from 'firebase/firestore';
import { auth } from './firebaseAuth';
import firebaseConfig from '../../firebase-applet-config.json';
import { 
  CouncilDocument, 
  CouncilTask, 
  CouncilEvent, 
  Department, 
  AdminUser, 
  SecuritySettings, 
  AccessControlSettings, 
  AdminAuditLog 
} from '../types';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);

// Test server connectivity on startup as per skill instructions
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'system_settings', 'ping'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline / network check:', error.message);
    }
  }
}
testFirestoreConnection();

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation:', JSON.stringify(errInfo));
}

// -------------------------------------------------------------
// DOCUMENTS SYNC
// -------------------------------------------------------------
export async function saveDocumentToFirestore(docItem: CouncilDocument) {
  try {
    await setDoc(doc(db, 'documents', docItem.id), docItem);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `documents/${docItem.id}`);
  }
}

export async function deleteDocumentFromFirestore(docId: string) {
  try {
    await deleteDoc(doc(db, 'documents', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `documents/${docId}`);
  }
}

export function subscribeToDocuments(
  callback: (docs: CouncilDocument[]) => void, 
  onError?: (err: any) => void
) {
  return onSnapshot(
    collection(db, 'documents'),
    (snapshot) => {
      const items: CouncilDocument[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as CouncilDocument);
      });
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'documents');
      if (onError) onError(error);
    }
  );
}

// -------------------------------------------------------------
// TASKS SYNC
// -------------------------------------------------------------
export async function saveTaskToFirestore(taskItem: CouncilTask) {
  try {
    await setDoc(doc(db, 'tasks', taskItem.id), taskItem);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `tasks/${taskItem.id}`);
  }
}

export async function deleteTaskFromFirestore(taskId: string) {
  try {
    await deleteDoc(doc(db, 'tasks', taskId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `tasks/${taskId}`);
  }
}

export function subscribeToTasks(
  callback: (tasks: CouncilTask[]) => void, 
  onError?: (err: any) => void
) {
  return onSnapshot(
    collection(db, 'tasks'),
    (snapshot) => {
      const items: CouncilTask[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as CouncilTask);
      });
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tasks');
      if (onError) onError(error);
    }
  );
}

// -------------------------------------------------------------
// EVENTS SYNC
// -------------------------------------------------------------
export async function saveEventToFirestore(eventItem: CouncilEvent) {
  try {
    await setDoc(doc(db, 'events', eventItem.id), eventItem);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `events/${eventItem.id}`);
  }
}

export async function deleteEventFromFirestore(eventId: string) {
  try {
    await deleteDoc(doc(db, 'events', eventId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `events/${eventId}`);
  }
}

export function subscribeToEvents(
  callback: (events: CouncilEvent[]) => void, 
  onError?: (err: any) => void
) {
  return onSnapshot(
    collection(db, 'events'),
    (snapshot) => {
      const items: CouncilEvent[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as CouncilEvent);
      });
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'events');
      if (onError) onError(error);
    }
  );
}

// -------------------------------------------------------------
// DEPARTMENTS SYNC
// -------------------------------------------------------------
export async function saveDepartmentToFirestore(deptItem: Department) {
  try {
    await setDoc(doc(db, 'departments', deptItem.id), deptItem);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `departments/${deptItem.id}`);
  }
}

export async function deleteDepartmentFromFirestore(deptId: string) {
  try {
    await deleteDoc(doc(db, 'departments', deptId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `departments/${deptId}`);
  }
}

export function subscribeToDepartments(
  callback: (departments: Department[]) => void, 
  onError?: (err: any) => void
) {
  return onSnapshot(
    collection(db, 'departments'),
    (snapshot) => {
      const items: Department[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as Department);
      });
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'departments');
      if (onError) onError(error);
    }
  );
}

// -------------------------------------------------------------
// ADMINS SYNC (Fixes Cross-Device / Cross-User Admin Permissions)
// -------------------------------------------------------------
export async function saveAdminToFirestore(adminUser: AdminUser) {
  try {
    await setDoc(doc(db, 'admins', adminUser.id), adminUser);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `admins/${adminUser.id}`);
  }
}

export async function deleteAdminFromFirestore(adminId: string) {
  try {
    await deleteDoc(doc(db, 'admins', adminId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `admins/${adminId}`);
  }
}

export function subscribeToAdmins(
  callback: (admins: AdminUser[]) => void,
  onError?: (err: any) => void
) {
  return onSnapshot(
    collection(db, 'admins'),
    (snapshot) => {
      const items: AdminUser[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as AdminUser);
      });
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'admins');
      if (onError) onError(error);
    }
  );
}

// -------------------------------------------------------------
// SYSTEM & SECURITY SETTINGS SYNC
// -------------------------------------------------------------
export async function saveSecuritySettingsToFirestore(settings: SecuritySettings) {
  try {
    await setDoc(doc(db, 'system_settings', 'security'), settings);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'system_settings/security');
  }
}

export function subscribeToSecuritySettings(
  callback: (settings: SecuritySettings) => void,
  onError?: (err: any) => void
) {
  return onSnapshot(
    doc(db, 'system_settings', 'security'),
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as SecuritySettings);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'system_settings/security');
      if (onError) onError(error);
    }
  );
}

export async function saveAccessControlSettingsToFirestore(settings: AccessControlSettings) {
  try {
    await setDoc(doc(db, 'system_settings', 'access_control'), settings);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'system_settings/access_control');
  }
}

export function subscribeToAccessControlSettings(
  callback: (settings: AccessControlSettings) => void,
  onError?: (err: any) => void
) {
  return onSnapshot(
    doc(db, 'system_settings', 'access_control'),
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as AccessControlSettings);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, 'system_settings/access_control');
      if (onError) onError(error);
    }
  );
}

// -------------------------------------------------------------
// AUDIT LOGS SYNC
// -------------------------------------------------------------
export async function saveAuditLogToFirestore(logItem: AdminAuditLog) {
  try {
    await setDoc(doc(db, 'audit_logs', logItem.id), logItem);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `audit_logs/${logItem.id}`);
  }
}

export function subscribeToAuditLogs(
  callback: (logs: AdminAuditLog[]) => void,
  onError?: (err: any) => void
) {
  return onSnapshot(
    collection(db, 'audit_logs'),
    (snapshot) => {
      const items: AdminAuditLog[] = [];
      snapshot.forEach((d) => {
        items.push(d.data() as AdminAuditLog);
      });
      // Sort newest first
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'audit_logs');
      if (onError) onError(error);
    }
  );
}

// -------------------------------------------------------------
// AUTO-SEED HELPER
// Ensures that on a fresh cloud database, all council data is populated
// so all connected devices immediately see and receive identical state!
// -------------------------------------------------------------
export async function seedFirestoreIfEmpty(
  initialDepts: Department[],
  initialDocs: CouncilDocument[],
  initialTasks: CouncilTask[],
  initialEvents: CouncilEvent[],
  initialAdmins: AdminUser[],
  initialSecurity: SecuritySettings,
  initialAccess: AccessControlSettings
) {
  try {
    // 1. Check departments
    const deptSnap = await getDocs(collection(db, 'departments'));
    if (deptSnap.empty) {
      for (const d of initialDepts) {
        await setDoc(doc(db, 'departments', d.id), d);
      }
    }

    // 2. Check documents
    const docSnap = await getDocs(collection(db, 'documents'));
    if (docSnap.empty) {
      for (const d of initialDocs) {
        await setDoc(doc(db, 'documents', d.id), d);
      }
    }

    // 3. Check tasks
    const taskSnap = await getDocs(collection(db, 'tasks'));
    if (taskSnap.empty) {
      for (const t of initialTasks) {
        await setDoc(doc(db, 'tasks', t.id), t);
      }
    }

    // 4. Check events
    const eventSnap = await getDocs(collection(db, 'events'));
    if (eventSnap.empty) {
      for (const e of initialEvents) {
        await setDoc(doc(db, 'events', e.id), e);
      }
    }

    // 5. Check admins
    const adminSnap = await getDocs(collection(db, 'admins'));
    if (adminSnap.empty) {
      for (const a of initialAdmins) {
        await setDoc(doc(db, 'admins', a.id), a);
      }
    }

    // 6. Check security settings
    await setDoc(doc(db, 'system_settings', 'security'), initialSecurity, { merge: true });
    await setDoc(doc(db, 'system_settings', 'access_control'), initialAccess, { merge: true });
  } catch (err) {
    console.warn('Initial Firestore seed check:', err);
  }
}
