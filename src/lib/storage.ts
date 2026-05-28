import { prisma } from './prisma';

export interface Upload {
  id: string;
  userId: string;
  filename: string;
  status: 'uploaded' | 'reviewed' | 'processed';
  reviewedAt?: string;
  comments?: string;
  reviewedData?: any;
  uploadedAt: string;
}

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'uploader' | 'reviewer';
}

export interface Settings {
  uploaderEmail: string;
  reviewerEmail: string;
}

// Users
export async function getUserByEmail(email: string): Promise<User | null> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  
  if (!user || !user.password) return null;
  
  return {
    id: user.id,
    email: user.email,
    password: user.password,
    name: user.name || '',
    role: user.role as 'uploader' | 'reviewer',
  };
}

// Settings
export async function getSettings(): Promise<Settings> {
  try {
    const settings = await prisma.settings.findFirst();
    
    if (settings) {
      return {
        uploaderEmail: settings.uploaderEmail,
        reviewerEmail: settings.reviewerEmail,
      };
    }
  } catch (error) {
    console.error('[DB] Error getting settings:', error);
  }
  
  // Fallback
  return {
    uploaderEmail: process.env.UPLOADER_EMAIL || 'lilly@elmarmaintenance.com',
    reviewerEmail: process.env.REVIEWER_EMAIL || 'pamela@elmarmaintenance.com',
  };
}

export async function updateSettings(settings: Partial<Settings>): Promise<Settings> {
  const existing = await prisma.settings.findFirst();
  
  if (existing) {
    const updated = await prisma.settings.update({
      where: { id: existing.id },
      data: settings,
    });
    
    return {
      uploaderEmail: updated.uploaderEmail,
      reviewerEmail: updated.reviewerEmail,
    };
  }
  
  const created = await prisma.settings.create({
    data: {
      uploaderEmail: settings.uploaderEmail || 'lilly@elmarmaintenance.com',
      reviewerEmail: settings.reviewerEmail || 'pamela@elmarmaintenance.com',
    },
  });
  
  return {
    uploaderEmail: created.uploaderEmail,
    reviewerEmail: created.reviewerEmail,
  };
}

// Uploads
export async function createUpload(data: {
  userId: string;
  filename: string;
  fileData: any;
}): Promise<Upload> {
  try {
    console.log('[DB] Creating upload:', { userId: data.userId, filename: data.filename });
    
    const upload = await prisma.upload.create({
      data: {
        userId: data.userId,
        filename: data.filename,
        fileData: JSON.stringify(data.fileData),
        status: 'uploaded',
      },
    });

    console.log('[DB] Upload created successfully:', upload.id);

    return {
      id: upload.id,
      userId: upload.userId,
      filename: upload.filename,
      status: upload.status as 'uploaded' | 'reviewed' | 'processed',
      uploadedAt: upload.uploadedAt.toISOString(),
      reviewedAt: upload.reviewedAt?.toISOString(),
      comments: upload.comments || undefined,
    };
  } catch (error) {
    console.error('[DB] Error creating upload:', error);
    throw error;
  }
}

export async function getUpload(id: string): Promise<Upload | null> {
  const upload = await prisma.upload.findUnique({
    where: { id },
  });

  if (!upload) return null;

  return {
    id: upload.id,
    userId: upload.userId,
    filename: upload.filename,
    status: upload.status as 'uploaded' | 'reviewed' | 'processed',
    uploadedAt: upload.uploadedAt.toISOString(),
    reviewedAt: upload.reviewedAt?.toISOString(),
    comments: upload.comments || undefined,
  };
}

export async function getUploadData(id: string): Promise<any> {
  const upload = await prisma.upload.findUnique({
    where: { id },
    select: { reviewedData: true, fileData: true },
  });

  if (!upload) return null;

  // Return reviewed data if available, otherwise original data
  if (upload.reviewedData) {
    return JSON.parse(upload.reviewedData);
  }
  
  if (upload.fileData) {
    return JSON.parse(upload.fileData);
  }

  return null;
}

export async function getAllUploads(): Promise<Upload[]> {
  const uploads = await prisma.upload.findMany({
    orderBy: { uploadedAt: 'desc' },
  });

  return uploads.map(upload => ({
    id: upload.id,
    userId: upload.userId,
    filename: upload.filename,
    status: upload.status as 'uploaded' | 'reviewed' | 'processed',
    uploadedAt: upload.uploadedAt.toISOString(),
    reviewedAt: upload.reviewedAt?.toISOString(),
    comments: upload.comments || undefined,
  }));
}

export async function updateUpload(id: string, updates: Partial<Upload>): Promise<Upload | null> {
  const upload = await prisma.upload.update({
    where: { id },
    data: {
      status: updates.status,
      comments: updates.comments,
      reviewedAt: updates.reviewedAt ? new Date(updates.reviewedAt) : undefined,
    },
  });

  return {
    id: upload.id,
    userId: upload.userId,
    filename: upload.filename,
    status: upload.status as 'uploaded' | 'reviewed' | 'processed',
    uploadedAt: upload.uploadedAt.toISOString(),
    reviewedAt: upload.reviewedAt?.toISOString(),
    comments: upload.comments || undefined,
  };
}

export async function updateUploadData(id: string, data: any): Promise<void> {
  await prisma.upload.update({
    where: { id },
    data: {
      reviewedData: JSON.stringify(data),
    },
  });
}

export async function deleteUpload(id: string): Promise<void> {
  await prisma.upload.delete({
    where: { id },
  });
}
