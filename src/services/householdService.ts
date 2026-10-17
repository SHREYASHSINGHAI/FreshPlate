import { db } from '../lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';

/**
 * Generate a clean, human-readable invite code of specified length.
 * Excludes easily confusable characters (0, O, 1, I).
 */
export function generateInviteCode(length: number = 6): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
  }
  let result = '';
  for (let i = 0; i < length; i++) {
    result += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return result;
}

/**
 * Creates an invite document in Firestore under `invites/{code}`.
 * In accordance with firestore.rules:
 * - `incoming().targetUid == request.auth.uid`
 * - `incoming().createdAt is timestamp`
 */
export async function createHouseholdInvite(userId: string): Promise<string> {
  if (!userId) {
    throw new Error('User ID is required to create an invite');
  }

  const code = generateInviteCode(6);
  const inviteRef = doc(db, 'invites', code);

  await setDoc(inviteRef, {
    targetUid: userId,
    createdAt: serverTimestamp(),
  });

  return code;
}

/**
 * Links a user to a target household using an invite code.
 *
 * Instead of attempting to update the target user's document directly
 * (`updateDoc(doc(db, 'users', targetUid), { sharedWith: arrayUnion(...) })`),
 * which is rejected by Firestore security rules with permission-denied
 * (`allow update: if isAdmin() || isOwner(uid)`), this function:
 *
 * 1. Reads the invite from `invites/{inviteCode}` to get `targetUid`.
 * 2. Writes a member document to `users/{targetUid}/members/{currentUser.uid}`
 *    with `{ inviteCode, joinedAt, email }`. This satisfies the Firestore rule:
 *    `allow create: if isSignedIn() && request.auth.uid == memberUid && ...`
 *    and grants access via `canAccessHousehold(householdUid)`.
 * 3. Updates the current user's profile document (`users/{currentUser.uid}`)
 *    with `{ linkedHousehold: targetUid }`, which is permitted because `isOwner(currentUser.uid)` is true.
 */
export async function joinHousehold(
  currentUser: { uid: string; email?: string | null },
  inviteCode: string
): Promise<{ targetUid: string }> {
  if (!currentUser?.uid) {
    throw new Error('You must be signed in to join a household');
  }

  const normalizedCode = inviteCode.trim().toUpperCase();
  if (!normalizedCode) {
    throw new Error('Please enter a valid invite code');
  }

  const inviteRef = doc(db, 'invites', normalizedCode);
  const inviteSnap = await getDoc(inviteRef);

  if (!inviteSnap.exists()) {
    throw new Error('Invalid or expired invite code');
  }

  const inviteData = inviteSnap.data();
  const targetUid = inviteData?.targetUid;

  if (!targetUid) {
    throw new Error('Invalid invite code');
  }

  if (targetUid === currentUser.uid) {
    throw new Error('You cannot join your own household');
  }

  // 1. Create member record in target household's subcollection
  // This satisfies firestore.rules for /users/{uid}/members/{memberUid}
  const memberRef = doc(db, 'users', targetUid, 'members', currentUser.uid);
  await setDoc(memberRef, {
    inviteCode: normalizedCode,
    joinedAt: serverTimestamp(),
    email: currentUser.email || '',
  });

  // 2. Link current user's profile to target household
  // This satisfies firestore.rules for /users/{uid} as isOwner(currentUser.uid) is true
  const userRef = doc(db, 'users', currentUser.uid);
  await setDoc(
    userRef,
    { linkedHousehold: targetUid },
    { merge: true }
  );

  return { targetUid };
}

/**
 * Leaves a joined household, removing the member record and clearing linkedHousehold.
 */
export async function leaveHousehold(
  currentUser: { uid: string },
  householdUid: string
): Promise<void> {
  if (!currentUser?.uid || !householdUid) {
    throw new Error('User ID and Household ID are required');
  }

  // 1. Remove member document from target household
  const memberRef = doc(db, 'users', householdUid, 'members', currentUser.uid);
  try {
    await deleteDoc(memberRef);
  } catch (err) {
    console.warn('Could not remove member record', err);
  }

  // 2. Clear linkedHousehold from current user's profile
  const userRef = doc(db, 'users', currentUser.uid);
  await setDoc(
    userRef,
    { linkedHousehold: null },
    { merge: true }
  );
}
