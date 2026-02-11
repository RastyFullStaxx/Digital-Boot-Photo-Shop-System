import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { NextResponse } from "next/server";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin123";
const ADMIN_API_TOKEN = process.env.ADMIN_API_TOKEN ?? "dev-admin-token";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt"
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      authorize(credentials) {
        if (!credentials) {
          return null;
        }

        if (credentials.username === ADMIN_USERNAME && credentials.password === ADMIN_PASSWORD) {
          return {
            id: "admin",
            name: "Admin",
            role: "admin"
          };
        }

        return null;
      }
    })
  ],
  pages: {
    signIn: "/admin"
  }
};

export function requireAdminApi(request: Request): NextResponse | null {
  const token = request.headers.get("x-admin-token");
  if (token === ADMIN_API_TOKEN) {
    return null;
  }

  return NextResponse.json(
    {
      error: "UNAUTHORIZED",
      message: "Admin token required"
    },
    { status: 401 }
  );
}
