import { auth } from '../firebase';

export enum OperationType {
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
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMsg = error instanceof Error ? error.message : String(error);

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  
  console.error('Firestore Error: ', JSON.stringify(errInfo));

  // Determine if this is an offline or network error
  const errCode = error && typeof error === 'object' && 'code' in error ? String((error as any).code) : '';
  const isNetworkOrOffline = 
    errMsg.toLowerCase().includes('offline') || 
    errMsg.toLowerCase().includes('network') || 
    errMsg.toLowerCase().includes('unavailable') ||
    errMsg.toLowerCase().includes('internet') ||
    errMsg.toLowerCase().includes('failed to get document') ||
    errMsg.toLowerCase().includes('connection') ||
    errCode === 'unavailable' ||
    errCode === 'failed-precondition' ||
    errCode === 'cancelled';

  if (isNetworkOrOffline || errCode !== '') {
    console.warn(`[Offline/Graceful Mode] Firestore operation '${operationType}' deferred/bypassed on path '${path}' due to connection/auth failure:`, errMsg, "Code:", errCode);
    return; // return/exit gracefully instead of throwing a fatal error
  }

  throw new Error(JSON.stringify(errInfo));
}
