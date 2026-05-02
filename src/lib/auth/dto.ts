import "server-only";

export type SessionDTO = {
  userId: string;
  email: string | null;
  isAdmin: boolean;
};
