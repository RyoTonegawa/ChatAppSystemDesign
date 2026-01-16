import { Inject, Injectable } from '@nestjs/common';
import { UserRepository } from '../repositories/user.repository';

@Injectable()
export class UserService {
  constructor(@Inject(UserRepository) private readonly userRepository: UserRepository) {}

  async getUser(userId: string) {
    return this.userRepository.getUser(userId);
  }
}
