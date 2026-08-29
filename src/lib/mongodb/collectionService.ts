import { ObjectId } from 'mongodb';
import { getDatabase, resetMongoClient } from './client';

export interface CollectionItem {
  id: number | string;
  mediaType: 'movie' | 'tv';
  title: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  releaseDate?: string;
  rating?: number;
  overview?: string;
  urlPath?: string;
}

export interface MongoCollection {
  _id?: ObjectId;
  slug: string;
  title: string;
  description?: string;
  userId: string;
  authorName: string;
  authorAvatar?: string;
  items: CollectionItem[];
  itemCount: number;
  yearStart?: number | null;
  yearEnd?: number | null;
  featuredPoster?: string | null;
  featuredBackdrop?: string | null;
  isPublic: boolean;
  views: number;
  likes: number;
  createdAt: number;
  updatedAt: number;
}

const COLLECTIONS_COLLECTION = 'collections';

async function getCollectionsCol() {
  const db = await getDatabase();
  return db.collection<MongoCollection>(COLLECTIONS_COLLECTION);
}

let isCollectionIndexInitialized = false;

function ensureCollectionIndexesBackground() {
  if (isCollectionIndexInitialized) return;
  isCollectionIndexInitialized = true;
  (async () => {
    try {
      const col = await getCollectionsCol();
      await Promise.allSettled([
        col.createIndex({ slug: 1 }, { unique: true }),
        col.createIndex({ userId: 1 }),
        col.createIndex({ title: 'text', description: 'text', authorName: 'text' }),
        col.createIndex({ createdAt: -1 }),
        col.createIndex({ views: -1 }),
      ]);
    } catch (err) {
      console.warn('[MongoDB] ensureCollectionIndexesBackground warning:', err);
    }
  })();
}

/**
 * Executes a MongoDB operation with 1 automatic retry on SSL/connection errors
 */
async function withMongoRetry<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (err: any) {
    const msg = err?.message || String(err);
    if (
      msg.includes('SSL') ||
      msg.includes('tlsv1') ||
      msg.includes('closed') ||
      msg.includes('topology') ||
      msg.includes('connection') ||
      msg.includes('ECONNRESET')
    ) {
      console.warn('[MongoDB] Transient connection/SSL error detected in collections, retrying once:', msg);
      resetMongoClient();
      return await operation();
    }
    throw err;
  }
}

/**
 * Generate unique slug from title
 */
export function generateCollectionSlug(title: string): string {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  return `${base || 'koleksi'}-${randomSuffix}`;
}

/**
 * Calculate year range and featured media from items
 */
export function calculateCollectionMeta(items: CollectionItem[]) {
  const years: number[] = [];
  let featuredPoster: string | null = null;
  let featuredBackdrop: string | null = null;

  for (const item of items) {
    if (item.releaseDate) {
      const y = parseInt(item.releaseDate.substring(0, 4), 10);
      if (!isNaN(y) && y > 1800 && y < 2100) {
        years.push(y);
      }
    }
    if (!featuredPoster && item.posterPath) {
      featuredPoster = item.posterPath;
    }
    if (!featuredBackdrop && item.backdropPath) {
      featuredBackdrop = item.backdropPath;
    }
  }

  years.sort((a, b) => a - b);
  const yearStart = years.length > 0 ? years[0] : null;
  const yearEnd = years.length > 0 ? years[years.length - 1] : null;

  return {
    itemCount: items.length,
    yearStart,
    yearEnd,
    featuredPoster: featuredPoster || (items[0]?.posterPath ?? null),
    featuredBackdrop: featuredBackdrop || (items[0]?.backdropPath ?? null),
  };
}

/**
 * Fetch public collections with search, filter, and pagination
 */
export async function getPublicCollections(params: {
  search?: string;
  filter?: 'all' | 'popular' | 'latest' | 'my';
  userId?: string;
  page?: number;
  limit?: number;
}): Promise<{ collections: MongoCollection[]; total: number }> {
  ensureCollectionIndexesBackground();

  return withMongoRetry(async () => {
    const col = await getCollectionsCol();
    const { search = '', filter = 'latest', userId, page = 1, limit = 24 } = params;

    const query: any = { isPublic: true };

    if (filter === 'my' && userId) {
      delete query.isPublic; // User can see all their own collections
      query.userId = userId;
    }

    if (search.trim()) {
      const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { title: { $regex: regex } },
        { description: { $regex: regex } },
        { authorName: { $regex: regex } },
      ];
    }

    let sortOption: any = { createdAt: -1 };
    if (filter === 'popular') {
      sortOption = { views: -1, createdAt: -1 };
    } else if (filter === 'latest') {
      sortOption = { createdAt: -1 };
    }

    const skip = Math.max(0, (page - 1) * limit);

    const [rawCollections, total] = await Promise.all([
      col.find(query).sort(sortOption).skip(skip).limit(limit).toArray(),
      col.countDocuments(query),
    ]);

    const collections = rawCollections.map((c) => ({
      ...c,
      _id: c._id ? c._id.toString() : undefined,
    })) as any[];

    return { collections, total };
  });
}

/**
 * Fetch single collection by ID or slug
 */
export async function getCollectionByIdOrSlug(idOrSlug: string): Promise<MongoCollection | null> {
  ensureCollectionIndexesBackground();

  return withMongoRetry(async () => {
    const col = await getCollectionsCol();
    let query: any = { slug: idOrSlug };

    if (ObjectId.isValid(idOrSlug)) {
      query = {
        $or: [{ _id: new ObjectId(idOrSlug) }, { slug: idOrSlug }],
      };
    }

    const collection = await col.findOne(query);
    if (collection) {
      // Increment views count in background
      col.updateOne({ _id: collection._id }, { $inc: { views: 1 } }).catch(() => {});
      return {
        ...collection,
        _id: collection._id ? (collection._id.toString() as any) : undefined,
      };
    }

    return null;
  });
}

/**
 * Create a new collection
 */
export async function createCollection(params: {
  userId: string;
  authorName: string;
  authorAvatar?: string;
  title: string;
  description?: string;
  items: CollectionItem[];
  isPublic?: boolean;
}): Promise<MongoCollection> {
  ensureCollectionIndexesBackground();

  return withMongoRetry(async () => {
    const col = await getCollectionsCol();
    const { userId, authorName, authorAvatar, title, description, items, isPublic = true } = params;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      throw new Error('Judul koleksi wajib diisi');
    }

    const meta = calculateCollectionMeta(items);
    const slug = generateCollectionSlug(trimmedTitle);
    const now = Date.now();

    const newDoc: MongoCollection = {
      slug,
      title: trimmedTitle,
      description: description?.trim() || '',
      userId,
      authorName,
      authorAvatar,
      items,
      itemCount: meta.itemCount,
      yearStart: meta.yearStart,
      yearEnd: meta.yearEnd,
      featuredPoster: meta.featuredPoster,
      featuredBackdrop: meta.featuredBackdrop,
      isPublic,
      views: 0,
      likes: 0,
      createdAt: now,
      updatedAt: now,
    };

    const res = await col.insertOne(newDoc as any);
    return { ...newDoc, _id: res.insertedId.toString() as any };
  });
}

/**
 * Update an existing collection (owner only)
 */
export async function updateCollection(
  idOrSlug: string,
  userId: string,
  updates: {
    title?: string;
    description?: string;
    items?: CollectionItem[];
    isPublic?: boolean;
  }
): Promise<MongoCollection | null> {
  return withMongoRetry(async () => {
    const col = await getCollectionsCol();
    let query: any = { slug: idOrSlug, userId };

    if (ObjectId.isValid(idOrSlug)) {
      query = {
        $and: [{ userId }, { $or: [{ _id: new ObjectId(idOrSlug) }, { slug: idOrSlug }] }],
      };
    }

    const existing = await col.findOne(query);
    if (!existing) {
      throw new Error('Koleksi tidak ditemukan atau Anda tidak memiliki izin untuk mengedit');
    }

    const updateFields: any = { updatedAt: Date.now() };

    if (typeof updates.title === 'string' && updates.title.trim()) {
      updateFields.title = updates.title.trim();
    }
    if (typeof updates.description === 'string') {
      updateFields.description = updates.description.trim();
    }
    if (typeof updates.isPublic === 'boolean') {
      updateFields.isPublic = updates.isPublic;
    }
    if (Array.isArray(updates.items)) {
      const meta = calculateCollectionMeta(updates.items);
      updateFields.items = updates.items;
      updateFields.itemCount = meta.itemCount;
      updateFields.yearStart = meta.yearStart;
      updateFields.yearEnd = meta.yearEnd;
      updateFields.featuredPoster = meta.featuredPoster;
      updateFields.featuredBackdrop = meta.featuredBackdrop;
    }

    await col.updateOne({ _id: existing._id }, { $set: updateFields });
    const updated = await col.findOne({ _id: existing._id });
    if (!updated) return null;
    return {
      ...updated,
      _id: updated._id ? (updated._id.toString() as any) : undefined,
    };
  });
}

/**
 * Delete a collection (owner only)
 */
export async function deleteCollection(idOrSlug: string, userId: string): Promise<boolean> {
  return withMongoRetry(async () => {
    const col = await getCollectionsCol();
    let query: any = { slug: idOrSlug, userId };

    if (ObjectId.isValid(idOrSlug)) {
      query = {
        $and: [{ userId }, { $or: [{ _id: new ObjectId(idOrSlug) }, { slug: idOrSlug }] }],
      };
    }

    const res = await col.deleteOne(query);
    return (res.deletedCount || 0) > 0;
  });
}
