import {
  collection,
  getDocs,
  limit,
  query,
  startAfter,
} from "firebase/firestore";
import type { DocumentData, QueryConstraint, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/services/firebase/firestoreClient";

/** Load every page; Firestore adds a stable implicit __name__ order when needed. */
export async function listAllQueryDocuments(
  collectionName: string,
  constraints: QueryConstraint[],
  pageSize: number,
): Promise<QueryDocumentSnapshot<DocumentData>[]> {
  const documents: QueryDocumentSnapshot<DocumentData>[] = [];
  let cursor: QueryDocumentSnapshot<DocumentData> | null = null;
  do {
    const pageConstraints = [...constraints];
    if (cursor) pageConstraints.push(startAfter(cursor));
    pageConstraints.push(limit(pageSize));
    const snapshot = await getDocs(query(collection(db, collectionName), ...pageConstraints));
    documents.push(...snapshot.docs);
    cursor = snapshot.docs.length ? snapshot.docs[snapshot.docs.length - 1] : null;
    if (snapshot.docs.length < pageSize) break;
  } while (cursor);
  return documents;
}
