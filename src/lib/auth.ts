import CredentialsProvider from 'next-auth/providers/credentials';
import type { AuthOptions } from 'next-auth';
import bcrypt from 'bcryptjs';
import { getUserByEmail } from './storage';

// Hardcoded users for Vercel (filesystem is read-only)
const HARDCODED_USERS = [
  {
    id: 'lilly-user',
    email: 'lilly@elmarmaintenance.com',
    password: '$2b$10$CvD2lAuCEJvfkpp4Fl1yuOjXz.XcvXPJ4uDgRDYMoHtIFIbbtzyEO', // Elmar@2025
    name: 'Lilly',
    role: 'uploader' as const
  },
  {
    id: 'pamela-user',
    email: 'pamela@elmarmaintenance.com',
    password: '$2b$10$CvD2lAuCEJvfkpp4Fl1yuOjXz.XcvXPJ4uDgRDYMoHtIFIbbtzyEO', // Elmar@2025
    name: 'Pamela',
    role: 'uploader' as const
  },
  {
    id: 'brahim-user',
    email: 'brahim@elmarservices.com',
    password: '$2b$10$CvD2lAuCEJvfkpp4Fl1yuOjXz.XcvXPJ4uDgRDYMoHtIFIbbtzyEO', // Elmar@2025
    name: 'Brahim',
    role: 'reviewer' as const
  }
];

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials: Record<string, string> | undefined) {
        if (!credentials?.email || !credentials?.password) {
          console.log('[AUTH] Missing credentials');
          return null;
        }

        console.log('[AUTH] Attempting login for:', credentials.email);

        try {
          // On Vercel, use hardcoded users (filesystem is read-only)
          let user;
          if (process.env.VERCEL) {
            console.log('[AUTH] Using hardcoded users (Vercel environment)');
            user = HARDCODED_USERS.find(u => u.email.toLowerCase() === credentials.email.toLowerCase());
          } else {
            // Local development: use filesystem storage
            user = await getUserByEmail(credentials.email);
          }

          console.log('[AUTH] User found:', user ? 'yes' : 'no');

          if (!user) {
            console.log('[AUTH] User not found');
            return null;
          }

          console.log('[AUTH] Checking hashed password');
          const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

          if (!isPasswordValid) {
            console.log('[AUTH] Password invalid');
            return null;
          }

          console.log('[AUTH] Login successful');
          return {
            id: user.id,
            name: user.name || user.email,
            email: user.email,
            role: user.role,
          };
        } catch (error) {
          console.error('[AUTH] Error during authorization:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.role = token.role as string;
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/signin',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};
