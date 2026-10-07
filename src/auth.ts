import NextAuth, { type DefaultSession } from "next-auth";
import GitHub from "next-auth/providers/github";

declare module "next-auth" {
  interface Session {
    accessToken?: string;
    user: DefaultSession["user"];
  }
}

if (!process.env.AUTH_SECRET && process.env.NODE_ENV !== "production") {
  console.warn("⚠️ AUTH_SECRET is not defined. Please ensure it is set in your .env.local file.");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      authorization: {
        params: {
          // We need repo scope to interact with the user's Github repository
          scope: "read:user user:email repo",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session }) {
      // Send properties to the client, like an access_token from a provider.
      // But actually, we shouldn't send the accessToken to the client for security.
      // We will only use it server-side in our Server Actions.
      return session;
    },
  },
});
