export abstract class UserRepository {
  abstract getUser(userId: string): Promise<{ id: string; name: string } | null>;
}
